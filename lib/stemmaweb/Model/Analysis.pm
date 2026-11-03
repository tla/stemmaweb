package stemmaweb::Model::Analysis;
use strict;
use warnings;
use Algorithm::Diff;
use Exporter qw/ import /;
use JSON qw/ decode_json encode_json /;
use LWP::UserAgent;
use POSIX ();
use vars qw/ @EXPORT_OK /;

@EXPORT_OK = qw/ run_analysis wit_stringify /;

=head1 NAME

stemmaweb::Model::Analysis - run the Stexaminer analysis for a stemma and the
alignment data held in Stemmarest

=head1 DESCRIPTION

This replaces the old Text::Tradition::Analysis. It turns the alignment of a
tradition section (as served by Stemmarest at C</tradition/$id/section/$sid/json>)
into a list of witness groupings, one per variant location; sends these, along
with the stemma, to the Stexaminer service for the C<findGroupings> and
C<findClasses> calculations; and folds the answers back into the per-location
structure that the Stexaminer page expects.

=head1 FUNCTIONS

=head2 run_analysis( $stemma, \@sections, %opts )

C<$stemma> is a stemmaweb::Model::Stemma object. Each element of C<@sections>
is a hash with the keys C<id>, C<name>, C<alignment> (the decoded section JSON)
and C<relations> (the decoded list of section relations, optional.)

Options:

=over 4

=item * stexaminer_url - Base URL of the Stexaminer service. Required unless
C<solver> is given.

=item * solver - A coderef called as C<< $solver->($command, $dot, \@groupings) >>
that should return the decoded Stexaminer result list. Mostly useful for testing.

=item * exclude_type1 - Leave out locations where the variation is uninformative
(only singleton readings in witnesses that have no descendants.)

=item * merge_types - Array of relation types whose readings should be treated
as the same reading.

=item * max_parallel - How many requests to have in flight at once (default 8.)

=item * max_batch - How many locations to send to the service in one request
(default 20.)

=item * poll_timeout - How many seconds to wait for a slow calculation.

=back

Returns a hash with the keys C<variants>, C<variant_count>, C<genealogical_count>,
C<conflict_count> and C<reversion_count>. If the Stexaminer could not be reached
or did not answer sensibly, the variants are returned unsolved and the key
C<error> is set.

=cut

our $AC_LABEL = ' (a.c.)';
my $OMITTED = '(omitted)';

sub run_analysis {
    my ($stemma, $sections, %opts) = @_;
    die "This stemma has no root, so there is no direction of copying to analyze. Choose a root for it on the stemma page first.\n" if $stemma->is_undirected;

    my @locations;
    my $multi = @$sections > 1;
    foreach my $section (@$sections) {
        push(@locations, _section_locations($stemma, $section, $multi, \%opts));
    }

    # The a.c. witnesses in play change the stemma graph, so locations that
    # involve different sets of them get different problems.
    my %problem;
    foreach my $loc (@locations) {
        my $key = join("\0", @{ $loc->{layerwits} });
        $problem{$key} ||= { layerwits => $loc->{layerwits}, locations => [] };
        push(@{ $problem{$key}->{locations} }, $loc);
    }

    # Prepare the problems, ask the Stexaminer about all of them at once, and
    # fold in the answers.
    my @problems = map { $problem{$_} } sort keys %problem;
    my @errors;
    my $fail = sub {
        my ($problem, $msg) = @_;
        return if $problem->{failed};
        $msg =~ s/\s+$//;
        $problem->{failed} = 1;
        push(@errors, $msg);
        $_->{unsolved} = 'IDP error' for @{ $problem->{locations} };
    };
    my @jobs;
    foreach my $problem (@problems) {
        eval { _prepare($stemma, $problem, \%opts) };
        if ($@) {
            $fail->($problem, $@);
            next;
        }
        foreach my $command (qw/ findGroupings findClasses /) {
            foreach my $bi (0 .. $#{ $problem->{batches} }) {
                push(@jobs, { problem => $problem, command => $command, batch => $bi });
            }
        }
    }
    my $solver = $opts{solver} || sub { _call_stexaminer(\%opts, @_) };
    my @answers = _parallel_map(
        exists $opts{max_parallel} ? $opts{max_parallel} : 8,
        sub {
            my $job = shift;
            my $problem = $job->{problem};
            my $batch = $problem->{batches}->[ $job->{batch} ];
            my $answer = eval { $solver->($job->{command}, $problem->{dot}, $batch) };
            return { error => $@ } if $@;
            return { error => "Stexaminer returned "
                  . (ref $answer eq 'ARRAY' ? scalar(@$answer) : 'no')
                  . " results for " . scalar(@$batch) . " locations\n" }
              unless ref $answer eq 'ARRAY' && @$answer == @$batch;
            return { answer => $answer };
        },
        @jobs
    );
    foreach my $i (0 .. $#jobs) {
        my ($job, $answer) = ($jobs[$i], $answers[$i]);
        if ($answer->{error}) {
            $fail->($job->{problem}, $answer->{error});
        } else {
            $job->{problem}->{answers}->{ $job->{command} }->[ $job->{batch} ] =
              $answer->{answer};
        }
    }
    foreach my $problem (@problems) {
        next if $problem->{failed};
        eval { _assemble($problem) };
        $fail->($problem, $@) if $@;
    }
    my $error = join('; ', @errors);

    my ($genealogical, $conflicts, $reversions) = (0, 0, 0);
    foreach my $loc (@locations) {
        if ($loc->{unsolved}) {
            _init_unsolved($loc);
        } else {
            $genealogical++ if $loc->{genealogical};
            _analyze_location($loc);
        }
        my %missing = map { $_ => 1 } @{ $loc->{missing} };
        my @layerwits;
        foreach my $rdg (@{ $loc->{readings} }) {
            $conflicts++   if $rdg->{is_conflict};
            $reversions++  if $rdg->{is_reverted};
            my @real = grep { !$missing{$_} } @{ $rdg->{group} };
            $rdg->{group} = \@real;
            foreach (@real) {
                push(@layerwits, $1) if $_ =~ /^(.*)\Q$AC_LABEL\E$/;
            }
        }
        if (@layerwits) {
            $loc->{layerwits} = \@layerwits;
        } else {
            delete $loc->{layerwits};
        }
        delete @{$loc}{qw/ graph relinfo rdginfo order groups rank /};
    }

    my $result = {
        variants           => \@locations,
        variant_count      => scalar @locations,
        genealogical_count => $genealogical,
        conflict_count     => $conflicts,
        reversion_count    => $reversions,
    };
    $result->{error} = "Stexaminer calculation failed: $error" if $error;
    return $result;
}

# Work out the variant locations of a section: for each rank at which there is
# variation, the witnesses (a.c. layers included) sharing each reading.
sub _section_locations {
    my ($stemma, $section, $multi, $opts) = @_;
    my $aln = $section->{alignment};
    my $graph = $stemma->graph;
    my %extant = map { $_ => 1 } $stemma->witnesses;
    my @hypotheticals = $stemma->hypotheticals;

    # Which readings should we treat as one?
    my $collapse = _collapse_classes($section->{relations}, $opts->{merge_types});

    # Sort the alignment rows into main witnesses and their layers
    my (@main, @layers, %present);
    foreach my $row (@{ $aln->{alignment} }) {
        my $wit = $row->{witness};
        next unless $extant{$wit};
        $present{$wit} = 1;
        if (!$row->{layer}) {
            push(@main, { wit => $wit, label => $wit, tokens => $row->{tokens} });
        } elsif ($row->{layer} eq 'a.c.') {
            push(@layers, { wit => $wit, label => $wit . $AC_LABEL,
                tokens => $row->{tokens} });
        }
    }

    # Stemma witnesses that have no text here are always missing
    my @never = grep { !$present{$_} } keys %extant;

    # Relation lookup for the parent analysis
    my $relinfo = _relation_lookup($section->{relations});

    my @locations;
    foreach my $rank (1 .. $aln->{length}) {
        my $idx = $rank - 1;
        my (%group, %reading, %lacuna, @gap);
        foreach my $row (@main) {
            my $tok = $row->{tokens}->[$idx];
            if (!defined $tok) {
                push(@gap, $row->{label});
            } elsif ($tok->{is_lacuna}) {
                $lacuna{ $row->{wit} } = 1;
            } else {
                push(@{ $group{ $tok->{id} } }, $row->{label});
                $reading{ $tok->{id} } = $tok;
            }
        }
        my %in_gap = map { $_ => 1 } @gap;
        foreach my $row (@layers) {
            next if $lacuna{ $row->{wit} };
            my $tok = $row->{tokens}->[$idx];
            next if $tok && $tok->{is_lacuna};
            if (!defined $tok) {
                # Same omission as the main witness: nothing to record
                next if $in_gap{ $row->{wit} };
                push(@gap, $row->{label});
            } else {
                next if grep { $_ eq $row->{wit} } @{ $group{ $tok->{id} } || [] };
                push(@{ $group{ $tok->{id} } }, $row->{label});
                $reading{ $tok->{id} } ||= $tok;
            }
        }

        # Merge readings that are to be treated as the same
        if ($collapse) {
            my %merged;
            foreach my $rid (keys %group) {
                my $class = $collapse->{$rid};
                push(@{ $merged{ defined $class ? "c$class" : "r$rid" } }, $rid);
            }
            my (%mgroup, %mreading);
            foreach my $rids (values %merged) {
                my ($rep) = sort { @{ $group{$b} } <=> @{ $group{$a} } || $a cmp $b }
                    @$rids;
                $mgroup{$rep} = [ map { @{ $group{$_} } } @$rids ];
                $mreading{$rep} = $reading{$rep};
            }
            %group = %mgroup;
            %reading = %mreading;
        }
        $group{$OMITTED} = \@gap if @gap;
        next unless keys %group > 1;

        # Canonical order, so that identical problems look identical
        my @rids = sort {
            @{ $group{$b} } <=> @{ $group{$a} }
              || join(',', sort @{ $group{$a} }) cmp join(',', sort @{ $group{$b} })
        } keys %group;
        foreach my $rid (@rids) { $group{$rid} = [ sort @{ $group{$rid} } ] }

        if ($opts->{exclude_type1}) {
            my $useful = 0;
            foreach my $rid (@rids) {
                my @w = @{ $group{$rid} };
                my @children = $graph->successors($w[0]);
                if (@w > 1 || @children && $w[0] !~ /\Q$AC_LABEL\E$/) {
                    $useful++;
                }
            }
            next unless $useful > 1;
        }

        my %missing = map { $_ => 1 } @hypotheticals, @never, keys %lacuna;
        my @layerwits;
        foreach my $rid (@rids) {
            foreach (@{ $group{$rid} }) {
                push(@layerwits, $1) if $_ =~ /^(.*)\Q$AC_LABEL\E$/;
            }
        }
        my %lw = map { $_ => 1 } @layerwits;

        push(@locations, {
            id        => $multi ? $section->{name} . ":$rank" : $rank,
            rank      => $rank,
            order     => \@rids,
            groups    => \%group,
            rdginfo   => \%reading,
            missing   => [ sort keys %missing ],
            layerwits => [ sort keys %lw ],
            relinfo   => $relinfo,
        });
    }
    return @locations;
}

# Return a hash of reading ID -> class ID for readings joined by relations of
# the given types, or undef if there are no types to merge.
sub _collapse_classes {
    my ($relations, $types) = @_;
    return undef unless $types && @$types && $relations;
    my %merge = map { $_ => 1 } @$types;
    my %parent;
    my $find;
    $find = sub {
        my $x = shift;
        $parent{$x} = $x unless exists $parent{$x};
        $parent{$x} = $find->($parent{$x}) if $parent{$x} ne $x;
        return $parent{$x};
    };
    foreach my $rel (@$relations) {
        next unless $merge{ $rel->{type} };
        $parent{ $find->($rel->{source}) } = $find->($rel->{target});
    }
    my %class;
    $class{$_} = $find->($_) for keys %parent;
    return \%class;
}

sub _relation_lookup {
    my ($relations) = @_;
    my %info;
    foreach my $rel (@{ $relations || [] }) {
        next if $rel->{type} eq 'collated';
        $info{ join("\0", sort $rel->{source}, $rel->{target}) } = $rel;
    }
    return \%info;
}

# Send the groupings of the locations in a problem to the Stexaminer, and record
# what it says in the locations.
sub _prepare {
    my ($stemma, $problem, $opts) = @_;
    my $locs = $problem->{locations};
    my $extant = { map { $_ => 1 } $stemma->witnesses };
    my $graph = $stemma->situation_graph($extant, $problem->{layerwits}, $AC_LABEL);

    # The solver reads the graph through graphviz, which makes a mess of names
    # with spaces or non-ASCII characters, so give the vertices plain names.
    my (%to, %from, %used);
    my @vertices = sort $graph->vertices;
    $used{$_} = 1 for grep { /^[A-Za-z0-9]+$/ } @vertices;
    my $n = 0;
    foreach my $v (@vertices) {
        if ($v =~ /^[A-Za-z0-9]+$/) {
            $to{$v} = $v;
        } else {
            do { $n++ } while $used{"w$n"};
            $to{$v} = "w$n";
            $used{"w$n"} = 1;
        }
        $from{ $to{$v} } = $v;
    }
    # The solver only looks at the vertices and edges, so keep the string short.
    my %linked;
    my $dot = 'digraph stemma { ';
    foreach my $e (sort { $a->[0] cmp $b->[0] || $a->[1] cmp $b->[1] } $graph->edges) {
        $dot .= sprintf('"%s" -> "%s"; ', $to{ $e->[0] }, $to{ $e->[1] });
        $linked{$_} = 1 for @$e;
    }
    $dot .= sprintf('"%s"; ', $to{$_}) for grep { !$linked{$_} } @vertices;
    $dot .= '}';

    my @groupings = map {
        my $loc = $_;
        [ map { [ map { $to{$_} // die "Witness $_ is not in the stemma\n" }
            @{ $loc->{groups}->{$_} } ] } @{ $loc->{order} } ]
    } @$locs;

    # The service stores each request in a column of limited size, so send the
    # groupings in batches that fit. It only caches the answers to requests it
    # can finish within a couple of seconds, so keep the batches smallish too.
    my $json = JSON->new->canonical;
    my $budget = ($opts->{max_request_size} || 4096) - length($dot) - 120;
    die "The stemma is too large for the Stexaminer\n" if $budget < 200;
    my $max_batch = $opts->{max_batch} || 20;
    my (@batches, @batch, $size);
    foreach my $g (@groupings) {
        my $enc = $json->encode($g);
        my $glen = length($enc) + ($enc =~ tr/,//) + 2;
        if (@batch && ($size + $glen > $budget || @batch >= $max_batch)) {
            push(@batches, [@batch]);
            (@batch, $size) = ();
        }
        push(@batch, $g);
        $size += $glen;
    }
    push(@batches, \@batch) if @batch;

    $problem->{batches} = \@batches;
    $problem->{dot}     = $dot;
    $problem->{graph}   = $graph;
    $problem->{from}    = \%from;
}

# Record what the Stexaminer said about the locations of a problem.
sub _assemble {
    my ($problem) = @_;
    my $locs  = $problem->{locations};
    my $graph = $problem->{graph};
    my %from  = %{ $problem->{from} };
    my $grp_answer = [ map { @$_ } @{ $problem->{answers}->{findGroupings} } ];
    my $cls_answer = [ map { @$_ } @{ $problem->{answers}->{findClasses} } ];

    foreach my $i (0 .. $#$locs) {
        my $loc = $locs->[$i];
        $loc->{graph} = $graph;
        my ($grp, $genealogical) = @{ $grp_answer->[$i] };
        my ($cgrp, $classes) = @{ $cls_answer->[$i] };
        my $unmap = sub { [ map { $from{$_} // $_ } @{ $_[0] } ] };
        $loc->{genealogical} = $genealogical ? 1 : 0;

        # Prefer the grouping that goes with the classes, if we have it
        my $use = _group_list($cgrp);
        $use = _group_list($grp) unless @$use == @{ $loc->{order} };
        die "Stexaminer returned the wrong number of groups for location "
            . $loc->{id} . "\n" unless @$use == @{ $loc->{order} };

        my %classof;
        if (ref $classes eq 'HASH') {
            foreach my $class (keys %$classes) {
                $classof{ $from{$_} // $_ } = $class for @{ $classes->{$class} };
            }
        } elsif (ref $classes eq 'ARRAY') {
            foreach my $pair (@$classes) { $classof{ $from{ $pair->[0] } // $pair->[0] } = $pair->[1] }
        }
        $loc->{witcopy_types} = \%classof;
        $loc->{reading_roots} = { map { $_ => 1 } grep { $classof{$_} eq 'source' } keys %classof };
        $loc->{readings} = [
            map { { readingid => $loc->{order}->[$_], group => $unmap->($use->[$_]) } }
              0 .. $#$use
        ];
    }
}

# Run $code over @jobs, up to $max at a time in forked processes, and return
# the results in order. The results must be serializable as JSON.
sub _parallel_map {
    my ($max, $code, @jobs) = @_;
    return map { $code->($_) } @jobs if $max <= 1 || @jobs <= 1;

    my @results;
    my @queue = (0 .. $#jobs);
    my @running;
    while (@queue || @running) {
        while (@queue && @running < $max) {
            my $i = shift @queue;
            pipe(my $reader, my $writer) or die "Could not make a pipe: $!\n";
            my $pid = fork();
            die "Could not fork: $!\n" unless defined $pid;
            if ($pid == 0) {
                close $reader;
                my $out = eval { encode_json([ $code->($jobs[$i]) ]) }
                  // encode_json([ { error => "$@" } ]);
                print $writer $out;
                close $writer;
                POSIX::_exit(0);
            }
            close $writer;
            push(@running, { pid => $pid, index => $i, fh => $reader });
        }
        my $child = shift @running;
        my $fh = $child->{fh};
        my $out = do { local $/; <$fh> };
        close $fh;
        waitpid($child->{pid}, 0);
        my $decoded = eval { decode_json($out // '') };
        $results[ $child->{index} ] = $decoded ? $decoded->[0]
          : { error => "A Stexaminer request process died\n" };
    }
    return @results;
}

# The solver numbers its groups; make a list of them whichever way they come
sub _group_list {
    my ($g) = @_;
    return [] unless ref $g;
    return $g if ref $g eq 'ARRAY';
    return [ map { $g->{$_} } sort { $a <=> $b } keys %$g ];
}

sub _call_stexaminer {
    my ($opts, $command, $dot, $groupings) = @_;
    my $base = $opts->{stexaminer_url}
      or die "No Stexaminer URL has been configured\n";
    $base =~ s!/+$!!;
    my $ua = LWP::UserAgent->new(timeout => 300);
    my $request = encode_json({
        content => { command => $command, graph => $dot, groupings => $groupings }
    });

    # The service sometimes falls over under load with a bare 500 error page;
    # asking again is harmless.
    my $resp;
    foreach my $attempt (1 .. 3) {
        $resp = $ua->post("$base/calc-items/",
            'Content-Type' => 'application/json', Content => $request);
        last unless $resp->code >= 500 && $resp->content_type !~ /json/;
        sleep $attempt;
    }
    my $answer = _decode_answer($resp, $command);

    # The service answers right away only if the calculation is quick.
    my $deadline = time + ($opts->{poll_timeout} || 600);
    my $jobid = $answer->{jobid};
    if (!exists $answer->{result} && !$answer->{failure}) {
        my ($fb) = grep { /^Feedback/ } keys %$answer;
        ($jobid) = $answer->{$fb} =~ /jobid (\d+)/ if $fb;
    }
    while (!exists $answer->{result} && !$answer->{failure}) {
        die "Stexaminer sent an answer we did not understand\n" unless $jobid;
        die "Timed out waiting for Stexaminer job $jobid\n" if time > $deadline;
        sleep 2;
        $resp = $ua->get("$base/jobstatus/$jobid/");
        $answer = _decode_answer($resp, $command);
        if (exists $answer->{status} && $answer->{status} == 2) {
            die "Stexaminer $command failed: $answer->{result}\n";
        } elsif (exists $answer->{status} && $answer->{status} == 1) {
            delete $answer->{result};
        }
    }
    die "Stexaminer $command failed: $answer->{failure}\n" if $answer->{failure};
    my $result = $answer->{result};
    if (!ref $result) {
        $result =~ s/\s+$//;
        $result = decode_json($result);
    }
    return $result;
}

sub _decode_answer {
    my ($resp, $command) = @_;
    my $answer = eval { decode_json($resp->content) };
    unless ($resp->is_success || ref $answer eq 'HASH' && $answer->{failure}) {
        my $detail = substr($resp->decoded_content // '', 0, 300);
        die "Stexaminer $command request failed: " . $resp->status_line
            . ($detail ? " / $detail" : '') . "\n";
    }
    die "Stexaminer $command answered with something other than JSON\n"
        unless ref $answer eq 'HASH';
    die "Stexaminer $command request rejected: $answer->{error}\n" if $answer->{error};
    return $answer;
}

# The readings of a location that the solver could not handle
sub _init_unsolved {
    my ($loc) = @_;
    $loc->{readings} = [
        map { { readingid => $_, group => [ @{ $loc->{groups}->{$_} } ] } }
          @{ $loc->{order} }
    ];
    foreach my $rdg (@{ $loc->{readings} }) {
        _add_text($loc, $rdg);
    }
}

sub _add_text {
    my ($loc, $rdg) = @_;
    my $info = $loc->{rdginfo}->{ $rdg->{readingid} };
    if ($info) {
        $rdg->{text} = $info->{text}
          . ($info->{rank} == $loc->{rank} ? '' : ' [' . $info->{rank} . ']');
    } else {
        $rdg->{text} = $rdg->{readingid};
    }
}

=head2 Location analysis

The remaining functions work out, for each reading at a solved location, how
often it was copied or changed, where it was independently introduced, and
where its parent readings are. They are the analysis that used to live in
Text::Tradition::Analysis, with the reading information coming from the
alignment and relations of Stemmarest instead of a collation object.

=cut

sub _analyze_location {
    my ($loc) = @_;
    my $graph = $loc->{graph};
    my $reading_roots = delete $loc->{reading_roots};
    my $classinfo = delete $loc->{witcopy_types};

    # Which reading does each witness (or node of the graph) belong to?
    my %contig;
    foreach my $rdg (@{ $loc->{readings} }) {
        my @roots;
        foreach my $wit (@{ $rdg->{group} }) {
            $contig{$wit} = $rdg->{readingid};
            push(@roots, $wit) if $reading_roots->{$wit};
        }
        $rdg->{independent_occurrence} = \@roots;
    }

    foreach my $rdg (@{ $loc->{readings} }) {
        my $rid   = $rdg->{readingid};
        my @roots = @{ $rdg->{independent_occurrence} };
        my @reversions;
        if (%$classinfo) {
            @reversions = grep { ($classinfo->{$_} || '') eq 'revert' } @{ $rdg->{group} };
            $rdg->{reversions} = \@reversions;
        }
        my @group = @{ $rdg->{group} };
        $rdg->{followed} = scalar(@group) - (scalar(@roots) + scalar(@reversions));

        my $parents = _find_reading_parents($rid, $graph, \%contig, @roots);
        _resolve_parents($loc, $rid, $parents);
        $rdg->{source_parents} = $parents;
        if (@reversions) {
            my $revparents = _find_reading_parents($rid, $graph, \%contig, @reversions);
            _resolve_parents($loc, $rid, $revparents);
            $rdg->{reversion_parents} = $revparents;
        }

        # How many times was this reading changed, and how many times are we
        # not sure?
        my (%nofollow, %unknown);
        foreach my $wit (@group) {
            next unless $graph->has_vertex($wit);
            foreach my $child ($graph->successors($wit)) {
                if ($reading_roots->{$child} && $contig{$child}
                    && $contig{$child} ne $rid) {
                    $nofollow{$child} = 1;
                } elsif (!$contig{$child}) {
                    $unknown{$child} = 1;
                }
            }
        }
        $rdg->{not_followed}   = scalar keys %nofollow;
        $rdg->{follow_unknown} = scalar keys %unknown;

        unless ($loc->{genealogical}) {
            $rdg->{is_conflict} = @roots != 1 ? 1 : 0;
            $rdg->{is_reverted} = scalar @reversions;
        }
        _add_text($loc, $rdg);
    }
}

sub _find_reading_parents {
    my ($rid, $graph, $contig, @list) = @_;
    my $parenthash = {};
    foreach my $wit (@list) {
        next unless $graph->has_vertex($wit);
        my @check = $graph->predecessors($wit);
        my %seen;
        while (@check) {
            my @next;
            foreach my $wparent (@check) {
                next if $seen{$wparent}++;
                my $preading = $contig->{$wparent};
                if ($preading && $preading ne $rid) {
                    $parenthash->{$preading} = 1;
                } else {
                    push(@next, $graph->predecessors($wparent));
                }
            }
            @check = @next;
        }
    }
    return $parenthash;
}

sub _resolve_parents {
    my ($loc, $rid, $parents) = @_;
    my $rdginfo = $loc->{rdginfo};
    my $rdg     = $rdginfo->{$rid};
    foreach my $p (keys %$parents) {
        my $pobj  = $rdginfo->{$p};
        my $phash = { label => $pobj ? $pobj->{text} : $p };
        if ($pobj) {
            $phash->{text} = $pobj->{text};
            my $rel = $rdg && $loc->{relinfo}->{ join("\0", sort $p, $rid) };
            if ($rel) {
                $phash->{relation} = { type => $rel->{type} };
                $phash->{relation}->{annotation} = $rel->{annotation}
                    if defined $rel->{annotation} && length $rel->{annotation};
                $phash->{relation}->{$_} = $rel->{$_}
                    for grep { defined $rel->{$_} } qw/ non_independent is_significant /;
            } elsif ($rdg) {
                $phash->{relation} = { type => 'wordsimilar' }
                    if _similar($rdg->{text}, $pobj->{text});
            } else {
                $phash->{relation} = { type => 'deletion' };
            }
        } elsif ($p eq $OMITTED) {
            $phash->{relation} = { type => 'addition' };
        }
        $parents->{$p} = $phash;
    }
}

=head2 wit_stringify( $groups )

Takes an array of witness groupings and produces a string like
['A','B'] / ['C','D','E'] / ['F']

=cut

sub wit_stringify {
    my $groups = shift;
    my @gst;

    # If we were passed an array of witnesses instead of an array of
    # groupings, then "group" the witnesses first.
    unless (ref($groups->[0])) {
        $groups = [$groups];
    }
    foreach my $g (@$groups) {
        push(@gst, '[' . join(',', map { "'$_'" } @$g) . ']');
    }
    return join(' / ', @gst);
}

# Use Algorithm::Diff to get a sense of how close the words are to each other.
sub _similar {
    my ($word1, $word2) = sort { length($a) <=> length($b) } @_;
    my @let1 = split('', lc($word1));
    my @let2 = split('', lc($word2));
    my $diff = Algorithm::Diff->new(\@let1, \@let2);
    my $mag  = 0;
    while ($diff->Next) {
        if ($diff->Same) {
            # Take off points for longer strings
            my $cs = $diff->Range(1) - 2;
            $cs = 0 if $cs < 0;
            $mag -= $cs;
        } elsif (!$diff->Items(1)) {
            $mag += $diff->Range(2);
        } elsif (!$diff->Items(2)) {
            $mag += $diff->Range(1);
        } else {
            # Split the difference for substitutions
            my $c1 = $diff->Range(1) || 1;
            my $c2 = $diff->Range(2) || 1;
            $mag += ($c1 + $c2) / 2;
        }
    }
    return ($mag <= length($word1) / 2);
}

1;
