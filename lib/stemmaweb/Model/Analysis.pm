package stemmaweb::Model::Analysis;
use strict;
use warnings;
use Algorithm::Diff;
use Exporter qw/ import /;
use JSON qw/ decode_json encode_json /;
use LWP::UserAgent;
use POSIX ();
use vars qw/ @EXPORT_OK /;

@EXPORT_OK = qw/ run_analysis /;

=head1 NAME

stemmaweb::Model::Analysis - run the Stexaminer analysis for a stemma and the
alignment data held in Stemmarest

=head1 DESCRIPTION

Turn the JSON alignment of a Stemmarest tradition section into a list of 
witness groupings, one per variant location, and send them, along with the 
stemma, to the Stexaminer service for the C<findGroupings> and C<findClasses> 
calculations. Fold the answers back into the per-location structure that 
the Stexaminer page expects.

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

=item * max_parallel - How many requests to have in flight at once (default 8.)

=item * max_batch - How many locations to send to the service in one request
(default 20.)

=item * wait_timeout - How many seconds in all to wait for the calculations
to finish (default 60.) Some calculations take hours, and these are left to run
on the service; the locations that depend on them come back unsolved and
marked C<pending>, and are counted in C<incomplete>.

=item * poll_interval - How many seconds to leave between asking the service
whether a calculation has finished (default 2.)

=back

Returns a hash with the keys C<variants>, C<variant_count>, C<genealogical_count>,
C<conflict_count>, C<reversion_count> and C<incomplete>. If the Stexaminer could
not be reached or did not answer sensibly, the variants are returned unsolved and
the key C<error> is set.

=cut

our $AC_LABEL = ' (a.c.)';
my $OMITTED = '(omitted)';

sub run_analysis {
    my ($stemma, $sections, %opts) = @_;
    die "This stemma has no root, so there is no direction of copying to analyze. Choose a root for it on the dashboard first.\n" if $stemma->is_undirected;

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
    $opts{deadline} = time + (exists $opts{wait_timeout} ? $opts{wait_timeout} : 60);
    my $solver = $opts{solver} || sub { _call_stexaminer(\%opts, @_) };
    my @answers = _parallel_map(
        exists $opts{max_parallel} ? $opts{max_parallel} : 8,
        sub {
            my $job = shift;
            my $problem = $job->{problem};
            my $batch = $problem->{batches}->[ $job->{batch} ];
            my $answer = eval { $solver->($job->{command}, $problem->{dot}, $batch) };
            return { error => $@ } if $@;
            return { pending => 1 } if ref $answer eq 'HASH' && $answer->{pending};
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
        } elsif ($answer->{pending}) {
            $job->{problem}->{pending}->{ $job->{batch} } = 1;
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

    my ($genealogical, $conflicts, $reversions, $incomplete) = (0, 0, 0, 0);
    foreach my $loc (@locations) {
        if ($loc->{unsolved}) {
            $incomplete++ if $loc->{unsolved} eq 'pending';
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
        incomplete         => $incomplete,
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

    # Sort the aligned columns into main witnesses and their layers
    my (@main, @layers, %present);
    foreach my $col (@{ $aln->{alignment} }) {
        my $sigil = $col->{witness};
        next unless $extant{$sigil};
        $present{$sigil} = 1;
        if (!$col->{layer}) {
            push(@main, { wit => $sigil, label => $sigil, tokens => $col->{tokens} });
        } elsif ('(' . $col->{layer} . ')' eq $AC_LABEL) {
            # TODO: support layers besides a.c. when we have the graph alteration logic to support it
            push(@layers, { wit => $sigil, label => $sigil . $AC_LABEL,
                tokens => $col->{tokens} });
        }
    }

    # Keep track of which witnesses are missing from the section
    my @absent = grep { !$present{$_} } keys %extant;

    # Make relation lookup map for the parent analysis
    my $relinfo = _relation_lookup($section->{relations});

    my @locations;
    foreach my $rank (1 .. $aln->{length}) {
        my $idx = $rank - 1;
        my (%group, %reading, %lacuna, @gap);
        foreach my $witness (@main) {
            my $tok = $witness->{tokens}->[$idx];
            if (!defined $tok) {
                push(@gap, $witness->{label});
            } elsif ($tok->{is_lacuna}) {
                $lacuna{ $witness->{wit} } = 1;
            } else {
                push(@{ $group{ $tok->{id} } }, $witness->{label});
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

        my %missing = map { $_ => 1 } $stemma->hypotheticals, @absent, keys %lacuna;
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

sub _relation_lookup {
    my ($relations) = @_;
    my %info;
    foreach my $rel (@{ $relations || [] }) {
        # HACK - this should really be checking if the relation type is weak
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
    # groupings in batches that fit. 
    my $json = JSON->new->canonical;
    my $budget = ($opts->{max_request_size} || 4096) - length($dot) - 120;
    die "The stemma is too large for the Stexaminer\n" if $budget < 200;
    my $max_batch = $opts->{max_batch} || 20;
    my (@batches, @batch, @members, @batch_locs, $size);
    foreach my $i (0 .. $#groupings) {
        my $g = $groupings[$i];
        my $enc = $json->encode($g);
        my $glen = length($enc) + ($enc =~ tr/,//) + 2;
        if (@batch && ($size + $glen > $budget || @batch >= $max_batch)) {
            push(@batches, [@batch]);
            push(@batch_locs, [@members]);
            (@batch, @members, $size) = ();
        }
        push(@batch, $g);
        push(@members, $i);
        $size += $glen;
    }
    if (@batch) {
        push(@batches, \@batch);
        push(@batch_locs, \@members);
    }

    $problem->{batches} = \@batches;
    $problem->{batch_locs} = \@batch_locs;
    $problem->{dot}     = $dot;
    $problem->{graph}   = $graph;
    $problem->{from}    = \%from;
}

# Record what the Stexaminer said about the locations of a problem. Locations
# whose calculation is still running are marked as pending.
sub _assemble {
    my ($problem) = @_;
    my $graph = $problem->{graph};
    my %from  = %{ $problem->{from} };

    foreach my $bi (0 .. $#{ $problem->{batch_locs} }) {
        my @locs = @{ $problem->{locations} }[ @{ $problem->{batch_locs}->[$bi] } ];
        if ($problem->{pending}->{$bi}) {
            $_->{unsolved} = 'pending' for @locs;
            next;
        }
        my $grp_answer = $problem->{answers}->{findGroupings}->[$bi];
        my $cls_answer = $problem->{answers}->{findClasses}->[$bi];
        foreach my $i (0 .. $#locs) {
            my $loc = $locs[$i];
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

# Ask the Stexaminer service for a calculation. Returns the answer (a list with
# one result per grouping) or, if the calculation is still running when we run
# out of time to wait for it, the hash { pending => 1, jobid => $jobid }.
sub _call_stexaminer {
    my ($opts, $command, $dot, $groupings) = @_;
    my $base = $opts->{stexaminer_url}
      or die "No Stexaminer URL has been configured\n";
    $base =~ s!/+$!!;
    my $ua = LWP::UserAgent->new(timeout => 300);
    my $request = encode_json({
        content => { command => $command, graph => $dot, groupings => $groupings }
    });
    my $interval = $opts->{poll_interval} || 2;
    my $deadline = $opts->{deadline} // time + 60;

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

    # The service answers with the result right away only if the calculation is
    # quick; otherwise it says what the job ID is.
    my $jobid = $answer->{jobid};
    if (!exists $answer->{result} && !$answer->{failure}) {
        my ($fb) = grep { /^Feedback/ } keys %$answer;
        ($jobid) = $answer->{$fb} =~ /jobid (\d+)/ if $fb;
        die "Stexaminer sent an answer we did not understand\n" unless $jobid;
    }

    while (!exists $answer->{result} && !$answer->{failure}) {
        return { pending => 1, jobid => $jobid } if time >= $deadline;
        sleep $interval;
        $answer = _job_status($ua, $base, $jobid, $command)
          or die "Stexaminer has lost track of job $jobid\n";
    }
    die "Stexaminer $command failed: $answer->{failure}\n" if $answer->{failure};
    my $result = $answer->{result};
    if (!ref $result) {
        $result =~ s/\s+$//;
        $result = decode_json($result);
    }
    return $result;
}

# What the service says about a job: a hash that has a result if it has
# finished, or undef if the service does not know the job.
sub _job_status {
    my ($ua, $base, $jobid, $command) = @_;
    my $resp = $ua->get("$base/jobstatus/$jobid/");
    return undef if $resp->code == 400 || $resp->code == 404;
    my $answer = _decode_answer($resp, $command);
    my $status = $answer->{status} // -1;
    if ($status == 2) {
        $answer->{failure} = $answer->{result};
        delete $answer->{result};
    } elsif ($status != 0) {
        delete $answer->{result};
    }
    return $answer;
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
            $rdg->{is_reverted} = @reversions ? 1 : 0;
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
