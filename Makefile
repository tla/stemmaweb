# This Makefile is for the stemmaweb extension to perl.
#
# It was generated automatically by MakeMaker version
# 7.34 (Revision: 73400) from the contents of
# Makefile.PL. Don't edit this file, edit Makefile.PL instead.
#
#       ANY CHANGES MADE HERE WILL BE LOST!
#
#   MakeMaker ARGV: ()
#

#   MakeMaker Parameters:

#     ABSTRACT => q[Catalyst based application]
#     AUTHOR => [q[Tara L Andrews]]
#     BUILD_REQUIRES => { ExtUtils::MakeMaker=>q[6.36], IPC::System::Simple=>q[0], LWP::Protocol::PSGI=>q[0], Test::More=>q[0.88], Test::WWW::Mechanize=>q[0] }
#     CONFIGURE_REQUIRES => {  }
#     DISTNAME => q[stemmaweb]
#     EXE_FILES => [q[script/n4jtestdb.pl], q[script/stemmaweb_cgi.pl], q[script/stemmaweb_create.pl], q[script/stemmaweb_fastcgi.pl], q[script/stemmaweb_server.pl], q[script/stemmaweb_test.pl]]
#     LICENSE => q[perl]
#     NAME => q[stemmaweb]
#     NO_META => q[1]
#     PREREQ_PM => { Bio::Phylo::IO=>q[0], Cache::FileCache=>q[0], Catalyst::Action::RenderView=>q[0], Catalyst::Authentication::Credential::OpenID=>q[0], Catalyst::Plugin::Authentication=>q[0], Catalyst::Plugin::Cache=>q[0], Catalyst::Plugin::ConfigLoader=>q[0], Catalyst::Plugin::Session=>q[0], Catalyst::Plugin::Session::State::Cookie=>q[0], Catalyst::Plugin::Session::Store::File=>q[0], Catalyst::Plugin::StackTrace=>q[0], Catalyst::Plugin::Static::Simple=>q[0], Catalyst::Plugin::Unicode::Encoding=>q[0], Catalyst::Runtime=>q[5.90126], Catalyst::TraitFor::Controller::reCAPTCHA=>q[0], Catalyst::TraitFor::Request::ProxyBase=>q[0], Catalyst::View::Download::Plain=>q[0], Catalyst::View::Email::Template=>q[0], Catalyst::View::JSON=>q[0], Catalyst::View::TT=>q[0], CatalystX::Controller::Auth=>q[0.22], Config::General=>q[0], Crypt::OpenSSL::RSA=>q[0], Crypt::OpenSSL::X509=>q[0], Date::Parse=>q[0], Digest::SHA256=>q[0], ExtUtils::MakeMaker=>q[6.36], File::Temp=>q[0], File::Which=>q[0], File::chdir=>q[0], Graph=>q[0], Graph::Reader::Dot=>q[0], IO::All=>q[0], IPC::Run=>q[0], IPC::System::Simple=>q[0], JSON::WebToken=>q[0], JSON::XS=>q[0], LWP::Protocol::PSGI=>q[0], LWP::Protocol::https=>q[0], List::Util=>q[0], MIME::Base64=>q[0], Moose=>q[0], Plack::Middleware::ReverseProxyPath=>q[0], Test::More=>q[0.88], Test::WWW::Mechanize=>q[0], Throwable::X=>q[0], TryCatch=>q[0], URI::Escape=>q[0], XML::LibXML=>q[0], namespace::autoclean=>q[0], strictures=>q[0] }
#     TEST_REQUIRES => {  }
#     VERSION => q[0.01]
#     VERSION_FROM => q[lib/stemmaweb.pm]
#     dist => { PREOP=>q[$(PERL) -I. "-MModule::Install::Admin" -e "dist_preop(q($(DISTVNAME)))"] }
#     realclean => { FILES=>q[MYMETA.yml] }
#     test => { TESTS=>q[t/00cert.t t/01app.t t/02pod.t t/03podcoverage.t t/04login.t t/05register.t t/06openid.t t/07google.t t/controller_Relation.t t/controller_Root.t t/controller_Stemma.t t/controller_Stemweb.t t/controller_Users.t t/controller_Util.t t/model_Directory.t t/model_Stemma.t t/view_CSV.t t/view_Email-Template.t t/view_JSON.t t/view_TSV.t t/view_TT.t] }

# --- MakeMaker post_initialize section:


# --- MakeMaker const_config section:

# These definitions are from config.sh (via /System/Library/Perl/5.30/darwin-thread-multi-2level/Config.pm).
# They may have been overridden via Makefile.PL or on the command line.
AR = ar
CC = cc
CCCDLFLAGS =  
CCDLFLAGS =  
DLEXT = bundle
DLSRC = dl_dlopen.xs
EXE_EXT = 
FULL_AR = /usr/bin/ar
LD = cc
LDDLFLAGS =  -bundle -undefined dynamic_lookup -fstack-protector-strong
LDFLAGS =  -fstack-protector-strong
LIBC = 
LIB_EXT = .a
OBJ_EXT = .o
OSNAME = darwin
OSVERS = 21.0
RANLIB = /usr/bin/ar s
SITELIBEXP = /Library/Perl/5.30
SITEARCHEXP = /Library/Perl/5.30/darwin-thread-multi-2level
SO = dylib
VENDORARCHEXP = /Network/Library/Perl/5.30/darwin-thread-multi-2level
VENDORLIBEXP = /Network/Library/Perl/5.30


# --- MakeMaker constants section:
AR_STATIC_ARGS = cr
DIRFILESEP = /
DFSEP = $(DIRFILESEP)
NAME = stemmaweb
NAME_SYM = stemmaweb
VERSION = 0.01
VERSION_MACRO = VERSION
VERSION_SYM = 0_01
DEFINE_VERSION = -D$(VERSION_MACRO)=\"$(VERSION)\"
XS_VERSION = 0.01
XS_VERSION_MACRO = XS_VERSION
XS_DEFINE_VERSION = -D$(XS_VERSION_MACRO)=\"$(XS_VERSION)\"
INST_ARCHLIB = blib/arch
INST_SCRIPT = blib/script
INST_BIN = blib/bin
INST_LIB = blib/lib
INST_MAN1DIR = blib/man1
INST_MAN3DIR = blib/man3
MAN1EXT = 1
MAN3EXT = 3pm
INSTALLDIRS = site
DESTDIR = 
PREFIX = $(SITEPREFIX)
PERLPREFIX = /usr
SITEPREFIX = /usr
VENDORPREFIX = /usr/local
INSTALLPRIVLIB = /Library/Perl/Updates/5.30.3
DESTINSTALLPRIVLIB = $(DESTDIR)$(INSTALLPRIVLIB)
INSTALLSITELIB = /Library/Perl/5.30
DESTINSTALLSITELIB = $(DESTDIR)$(INSTALLSITELIB)
INSTALLVENDORLIB = /Network/Library/Perl/5.30
DESTINSTALLVENDORLIB = $(DESTDIR)$(INSTALLVENDORLIB)
INSTALLARCHLIB = /Library/Perl/Updates/5.30.3/darwin-thread-multi-2level
DESTINSTALLARCHLIB = $(DESTDIR)$(INSTALLARCHLIB)
INSTALLSITEARCH = /Library/Perl/5.30/darwin-thread-multi-2level
DESTINSTALLSITEARCH = $(DESTDIR)$(INSTALLSITEARCH)
INSTALLVENDORARCH = /Network/Library/Perl/5.30/darwin-thread-multi-2level
DESTINSTALLVENDORARCH = $(DESTDIR)$(INSTALLVENDORARCH)
INSTALLBIN = /usr/bin
DESTINSTALLBIN = $(DESTDIR)$(INSTALLBIN)
INSTALLSITEBIN = /usr/local/bin
DESTINSTALLSITEBIN = $(DESTDIR)$(INSTALLSITEBIN)
INSTALLVENDORBIN = /usr/local/bin
DESTINSTALLVENDORBIN = $(DESTDIR)$(INSTALLVENDORBIN)
INSTALLSCRIPT = /usr/bin
DESTINSTALLSCRIPT = $(DESTDIR)$(INSTALLSCRIPT)
INSTALLSITESCRIPT = /usr/local/bin
DESTINSTALLSITESCRIPT = $(DESTDIR)$(INSTALLSITESCRIPT)
INSTALLVENDORSCRIPT = /usr/local/bin
DESTINSTALLVENDORSCRIPT = $(DESTDIR)$(INSTALLVENDORSCRIPT)
INSTALLMAN1DIR = /usr/share/man/man1
DESTINSTALLMAN1DIR = $(DESTDIR)$(INSTALLMAN1DIR)
INSTALLSITEMAN1DIR = /usr/local/share/man/man1
DESTINSTALLSITEMAN1DIR = $(DESTDIR)$(INSTALLSITEMAN1DIR)
INSTALLVENDORMAN1DIR = /usr/local/share/man/man1
DESTINSTALLVENDORMAN1DIR = $(DESTDIR)$(INSTALLVENDORMAN1DIR)
INSTALLMAN3DIR = /usr/share/man/man3
DESTINSTALLMAN3DIR = $(DESTDIR)$(INSTALLMAN3DIR)
INSTALLSITEMAN3DIR = /usr/local/share/man/man3
DESTINSTALLSITEMAN3DIR = $(DESTDIR)$(INSTALLSITEMAN3DIR)
INSTALLVENDORMAN3DIR = /usr/local/share/man/man3
DESTINSTALLVENDORMAN3DIR = $(DESTDIR)$(INSTALLVENDORMAN3DIR)
PERL_LIB =
PERL_ARCHLIB = /System/Library/Perl/5.30/darwin-thread-multi-2level
PERL_ARCHLIBDEP = /System/Library/Perl/5.30/darwin-thread-multi-2level
LIBPERL_A = libperl.a
FIRST_MAKEFILE = Makefile
MAKEFILE_OLD = Makefile.old
MAKE_APERL_FILE = Makefile.aperl
PERLMAINCC = $(CC)
PERL_INC = /System/Library/Perl/5.30/darwin-thread-multi-2level/CORE
PERL_INCDEP = /System/Library/Perl/5.30/darwin-thread-multi-2level/CORE
PERL = "/usr/bin/perl" "-Iinc"
FULLPERL = "/usr/bin/perl" "-Iinc"
ABSPERL = $(PERL)
PERLRUN = $(PERL)
FULLPERLRUN = $(FULLPERL)
ABSPERLRUN = $(ABSPERL)
PERLRUNINST = $(PERLRUN) "-I$(INST_ARCHLIB)" "-Iinc" "-I$(INST_LIB)"
FULLPERLRUNINST = $(FULLPERLRUN) "-I$(INST_ARCHLIB)" "-Iinc" "-I$(INST_LIB)"
ABSPERLRUNINST = $(ABSPERLRUN) "-I$(INST_ARCHLIB)" "-Iinc" "-I$(INST_LIB)"
PERL_CORE = 0
PERM_DIR = 755
PERM_RW = 644
PERM_RWX = 755

MAKEMAKER   = /System/Library/Perl/5.30/ExtUtils/MakeMaker.pm
MM_VERSION  = 7.34
MM_REVISION = 73400

# FULLEXT = Pathname for extension directory (eg Foo/Bar/Oracle).
# BASEEXT = Basename part of FULLEXT. May be just equal FULLEXT. (eg Oracle)
# PARENT_NAME = NAME without BASEEXT and no trailing :: (eg Foo::Bar)
# DLBASE  = Basename part of dynamic library. May be just equal BASEEXT.
MAKE = make
FULLEXT = stemmaweb
BASEEXT = stemmaweb
PARENT_NAME = 
DLBASE = $(BASEEXT)
VERSION_FROM = lib/stemmaweb.pm
OBJECT = 
LDFROM = $(OBJECT)
LINKTYPE = dynamic
BOOTDEP = 

# Handy lists of source code files:
XS_FILES = 
C_FILES  = 
O_FILES  = 
H_FILES  = 
MAN1PODS = script/stemmaweb_cgi.pl \
	script/stemmaweb_create.pl \
	script/stemmaweb_fastcgi.pl \
	script/stemmaweb_server.pl \
	script/stemmaweb_test.pl
MAN3PODS = lib/String/Diff.pm \
	lib/stemmaweb.pm \
	lib/stemmaweb/Authentication/Credential/Google.pm \
	lib/stemmaweb/Controller/Relation.pm \
	lib/stemmaweb/Controller/Root.pm \
	lib/stemmaweb/Controller/Stemma.pm \
	lib/stemmaweb/Controller/Stemweb.pm \
	lib/stemmaweb/Controller/Stexaminer.pm \
	lib/stemmaweb/Controller/Users.pm \
	lib/stemmaweb/Controller/Util.pm \
	lib/stemmaweb/Model/Stemma.pm \
	lib/stemmaweb/Model/StemmaUtil.pm \
	lib/stemmaweb/View/CSV.pm \
	lib/stemmaweb/View/Email/Template.pm \
	lib/stemmaweb/View/JSON.pm \
	lib/stemmaweb/View/Plain.pm \
	lib/stemmaweb/View/TSV.pm \
	lib/stemmaweb/View/TT.pm

SDKROOT := $(shell xcrun --show-sdk-path)
PERL_SYSROOT = $(SDKROOT)

# Where to build things
INST_LIBDIR      = $(INST_LIB)
INST_ARCHLIBDIR  = $(INST_ARCHLIB)

INST_AUTODIR     = $(INST_LIB)/auto/$(FULLEXT)
INST_ARCHAUTODIR = $(INST_ARCHLIB)/auto/$(FULLEXT)

INST_STATIC      = 
INST_DYNAMIC     = 
INST_BOOT        = 

# Extra linker info
EXPORT_LIST        = 
PERL_ARCHIVE       = 
PERL_ARCHIVEDEP    = 
PERL_ARCHIVE_AFTER = 


TO_INST_PM = lib/Catalyst/Authentication/Store/Neo4p.pm \
	lib/Catalyst/Authentication/Store/Neo4p/User.pm \
	lib/String/Diff.pm \
	lib/stemmaweb.pm \
	lib/stemmaweb/Authentication/Credential/Google.pm \
	lib/stemmaweb/Authentication/FormHandler.pm \
	lib/stemmaweb/Controller/Relation.pm \
	lib/stemmaweb/Controller/Root.pm \
	lib/stemmaweb/Controller/Stemma.pm \
	lib/stemmaweb/Controller/Stemweb.pm \
	lib/stemmaweb/Controller/Stexaminer.pm \
	lib/stemmaweb/Controller/Users.pm \
	lib/stemmaweb/Controller/Util.pm \
	lib/stemmaweb/Error.pm \
	lib/stemmaweb/Model/Directory.pm \
	lib/stemmaweb/Model/Stemma.pm \
	lib/stemmaweb/Model/StemmaUtil.pm \
	lib/stemmaweb/View/CSV.pm \
	lib/stemmaweb/View/Email/Template.pm \
	lib/stemmaweb/View/GraphML.pm \
	lib/stemmaweb/View/JSON.pm \
	lib/stemmaweb/View/Plain.pm \
	lib/stemmaweb/View/SVG.pm \
	lib/stemmaweb/View/TSV.pm \
	lib/stemmaweb/View/TT.pm


# --- MakeMaker platform_constants section:
MM_Unix_VERSION = 7.34
PERL_MALLOC_DEF = -DPERL_EXTMALLOC_DEF -Dmalloc=Perl_malloc -Dfree=Perl_mfree -Drealloc=Perl_realloc -Dcalloc=Perl_calloc


# --- MakeMaker tool_autosplit section:
# Usage: $(AUTOSPLITFILE) FileToSplit AutoDirToSplitInto
AUTOSPLITFILE = $(ABSPERLRUN)  -e 'use AutoSplit;  autosplit($$$$ARGV[0], $$$$ARGV[1], 0, 1, 1)' --



# --- MakeMaker tool_xsubpp section:


# --- MakeMaker tools_other section:
SHELL = /bin/sh
CHMOD = chmod
CP = cp
MV = mv
NOOP = $(TRUE)
NOECHO = @
RM_F = rm -f
RM_RF = rm -rf
TEST_F = test -f
TOUCH = touch
UMASK_NULL = umask 0
DEV_NULL = > /dev/null 2>&1
MKPATH = $(ABSPERLRUN) -MExtUtils::Command -e 'mkpath' --
EQUALIZE_TIMESTAMP = $(ABSPERLRUN) -MExtUtils::Command -e 'eqtime' --
FALSE = false
TRUE = true
ECHO = echo
ECHO_N = echo -n
UNINST = 0
VERBINST = 0
MOD_INSTALL = $(ABSPERLRUN) -MExtUtils::Install -e 'install([ from_to => {@ARGV}, verbose => '\''$(VERBINST)'\'', uninstall_shadows => '\''$(UNINST)'\'', dir_mode => '\''$(PERM_DIR)'\'' ]);' --
DOC_INSTALL = $(ABSPERLRUN) -MExtUtils::Command::MM -e 'perllocal_install' --
UNINSTALL = $(ABSPERLRUN) -MExtUtils::Command::MM -e 'uninstall' --
WARN_IF_OLD_PACKLIST = $(ABSPERLRUN) -MExtUtils::Command::MM -e 'warn_if_old_packlist' --
MACROSTART = 
MACROEND = 
USEMAKEFILE = -f
FIXIN = $(ABSPERLRUN) -MExtUtils::MY -e 'MY->fixin(shift)' --
CP_NONEMPTY = $(ABSPERLRUN) -MExtUtils::Command::MM -e 'cp_nonempty' --


# --- MakeMaker makemakerdflt section:
makemakerdflt : all
	$(NOECHO) $(NOOP)


# --- MakeMaker dist section:
TAR = COPY_EXTENDED_ATTRIBUTES_DISABLE=1 COPYFILE_DISABLE=1 tar
TARFLAGS = cvf
ZIP = zip
ZIPFLAGS = -r
COMPRESS = gzip --best
SUFFIX = .gz
SHAR = shar
PREOP = $(PERL) -I. "-MModule::Install::Admin" -e "dist_preop(q($(DISTVNAME)))"
POSTOP = $(NOECHO) $(NOOP)
TO_UNIX = $(NOECHO) $(NOOP)
CI = ci -u
RCS_LABEL = rcs -Nv$(VERSION_SYM): -q
DIST_CP = best
DIST_DEFAULT = tardist
DISTNAME = stemmaweb
DISTVNAME = stemmaweb-0.01


# --- MakeMaker macro section:


# --- MakeMaker depend section:


# --- MakeMaker cflags section:


# --- MakeMaker const_loadlibs section:


# --- MakeMaker const_cccmd section:


# --- MakeMaker post_constants section:


# --- MakeMaker pasthru section:

PASTHRU = LIBPERL_A="$(LIBPERL_A)"\
	LINKTYPE="$(LINKTYPE)"\
	PREFIX="$(PREFIX)"\
	PASTHRU_DEFINE='$(DEFINE) $(PASTHRU_DEFINE)'\
	PASTHRU_INC='$(INC) $(PASTHRU_INC)'


# --- MakeMaker special_targets section:
.SUFFIXES : .xs .c .C .cpp .i .s .cxx .cc $(OBJ_EXT)

.PHONY: all config static dynamic test linkext manifest blibdirs clean realclean disttest distdir pure_all subdirs clean_subdirs makemakerdflt manifypods realclean_subdirs subdirs_dynamic subdirs_pure_nolink subdirs_static subdirs-test_dynamic subdirs-test_static test_dynamic test_static



# --- MakeMaker c_o section:


# --- MakeMaker xs_c section:


# --- MakeMaker xs_o section:


# --- MakeMaker top_targets section:
all :: pure_all manifypods
	$(NOECHO) $(NOOP)

pure_all :: config pm_to_blib subdirs linkext
	$(NOECHO) $(NOOP)

	$(NOECHO) $(NOOP)

subdirs :: $(MYEXTLIB)
	$(NOECHO) $(NOOP)

config :: $(FIRST_MAKEFILE) blibdirs
	$(NOECHO) $(NOOP)

help :
	perldoc ExtUtils::MakeMaker


# --- MakeMaker blibdirs section:
blibdirs : $(INST_LIBDIR)$(DFSEP).exists $(INST_ARCHLIB)$(DFSEP).exists $(INST_AUTODIR)$(DFSEP).exists $(INST_ARCHAUTODIR)$(DFSEP).exists $(INST_BIN)$(DFSEP).exists $(INST_SCRIPT)$(DFSEP).exists $(INST_MAN1DIR)$(DFSEP).exists $(INST_MAN3DIR)$(DFSEP).exists
	$(NOECHO) $(NOOP)

# Backwards compat with 6.18 through 6.25
blibdirs.ts : blibdirs
	$(NOECHO) $(NOOP)

$(INST_LIBDIR)$(DFSEP).exists :: Makefile.PL
	$(NOECHO) $(MKPATH) $(INST_LIBDIR)
	$(NOECHO) $(CHMOD) $(PERM_DIR) $(INST_LIBDIR)
	$(NOECHO) $(TOUCH) $(INST_LIBDIR)$(DFSEP).exists

$(INST_ARCHLIB)$(DFSEP).exists :: Makefile.PL
	$(NOECHO) $(MKPATH) $(INST_ARCHLIB)
	$(NOECHO) $(CHMOD) $(PERM_DIR) $(INST_ARCHLIB)
	$(NOECHO) $(TOUCH) $(INST_ARCHLIB)$(DFSEP).exists

$(INST_AUTODIR)$(DFSEP).exists :: Makefile.PL
	$(NOECHO) $(MKPATH) $(INST_AUTODIR)
	$(NOECHO) $(CHMOD) $(PERM_DIR) $(INST_AUTODIR)
	$(NOECHO) $(TOUCH) $(INST_AUTODIR)$(DFSEP).exists

$(INST_ARCHAUTODIR)$(DFSEP).exists :: Makefile.PL
	$(NOECHO) $(MKPATH) $(INST_ARCHAUTODIR)
	$(NOECHO) $(CHMOD) $(PERM_DIR) $(INST_ARCHAUTODIR)
	$(NOECHO) $(TOUCH) $(INST_ARCHAUTODIR)$(DFSEP).exists

$(INST_BIN)$(DFSEP).exists :: Makefile.PL
	$(NOECHO) $(MKPATH) $(INST_BIN)
	$(NOECHO) $(CHMOD) $(PERM_DIR) $(INST_BIN)
	$(NOECHO) $(TOUCH) $(INST_BIN)$(DFSEP).exists

$(INST_SCRIPT)$(DFSEP).exists :: Makefile.PL
	$(NOECHO) $(MKPATH) $(INST_SCRIPT)
	$(NOECHO) $(CHMOD) $(PERM_DIR) $(INST_SCRIPT)
	$(NOECHO) $(TOUCH) $(INST_SCRIPT)$(DFSEP).exists

$(INST_MAN1DIR)$(DFSEP).exists :: Makefile.PL
	$(NOECHO) $(MKPATH) $(INST_MAN1DIR)
	$(NOECHO) $(CHMOD) $(PERM_DIR) $(INST_MAN1DIR)
	$(NOECHO) $(TOUCH) $(INST_MAN1DIR)$(DFSEP).exists

$(INST_MAN3DIR)$(DFSEP).exists :: Makefile.PL
	$(NOECHO) $(MKPATH) $(INST_MAN3DIR)
	$(NOECHO) $(CHMOD) $(PERM_DIR) $(INST_MAN3DIR)
	$(NOECHO) $(TOUCH) $(INST_MAN3DIR)$(DFSEP).exists



# --- MakeMaker linkext section:

linkext :: dynamic
	$(NOECHO) $(NOOP)


# --- MakeMaker dlsyms section:


# --- MakeMaker dynamic_bs section:

BOOTSTRAP =


# --- MakeMaker dynamic section:

dynamic :: $(FIRST_MAKEFILE) config $(INST_BOOT) $(INST_DYNAMIC)
	$(NOECHO) $(NOOP)


# --- MakeMaker dynamic_lib section:


# --- MakeMaker static section:

## $(INST_PM) has been moved to the all: target.
## It remains here for awhile to allow for old usage: "make static"
static :: $(FIRST_MAKEFILE) $(INST_STATIC)
	$(NOECHO) $(NOOP)


# --- MakeMaker static_lib section:


# --- MakeMaker manifypods section:

POD2MAN_EXE = $(PERLRUN) "-MExtUtils::Command::MM" -e pod2man "--"
POD2MAN = $(POD2MAN_EXE)


manifypods : pure_all config  \
	lib/String/Diff.pm \
	lib/stemmaweb.pm \
	lib/stemmaweb/Authentication/Credential/Google.pm \
	lib/stemmaweb/Controller/Relation.pm \
	lib/stemmaweb/Controller/Root.pm \
	lib/stemmaweb/Controller/Stemma.pm \
	lib/stemmaweb/Controller/Stemweb.pm \
	lib/stemmaweb/Controller/Stexaminer.pm \
	lib/stemmaweb/Controller/Users.pm \
	lib/stemmaweb/Controller/Util.pm \
	lib/stemmaweb/Model/Stemma.pm \
	lib/stemmaweb/Model/StemmaUtil.pm \
	lib/stemmaweb/View/CSV.pm \
	lib/stemmaweb/View/Email/Template.pm \
	lib/stemmaweb/View/JSON.pm \
	lib/stemmaweb/View/Plain.pm \
	lib/stemmaweb/View/TSV.pm \
	lib/stemmaweb/View/TT.pm \
	script/stemmaweb_cgi.pl \
	script/stemmaweb_create.pl \
	script/stemmaweb_fastcgi.pl \
	script/stemmaweb_server.pl \
	script/stemmaweb_test.pl
	$(NOECHO) $(POD2MAN) --section=1 --perm_rw=$(PERM_RW) -u \
	  script/stemmaweb_cgi.pl $(INST_MAN1DIR)/stemmaweb_cgi.pl.$(MAN1EXT) \
	  script/stemmaweb_create.pl $(INST_MAN1DIR)/stemmaweb_create.pl.$(MAN1EXT) \
	  script/stemmaweb_fastcgi.pl $(INST_MAN1DIR)/stemmaweb_fastcgi.pl.$(MAN1EXT) \
	  script/stemmaweb_server.pl $(INST_MAN1DIR)/stemmaweb_server.pl.$(MAN1EXT) \
	  script/stemmaweb_test.pl $(INST_MAN1DIR)/stemmaweb_test.pl.$(MAN1EXT) 
	$(NOECHO) $(POD2MAN) --section=3 --perm_rw=$(PERM_RW) -u \
	  lib/String/Diff.pm $(INST_MAN3DIR)/String::Diff.$(MAN3EXT) \
	  lib/stemmaweb.pm $(INST_MAN3DIR)/stemmaweb.$(MAN3EXT) \
	  lib/stemmaweb/Authentication/Credential/Google.pm $(INST_MAN3DIR)/stemmaweb::Authentication::Credential::Google.$(MAN3EXT) \
	  lib/stemmaweb/Controller/Relation.pm $(INST_MAN3DIR)/stemmaweb::Controller::Relation.$(MAN3EXT) \
	  lib/stemmaweb/Controller/Root.pm $(INST_MAN3DIR)/stemmaweb::Controller::Root.$(MAN3EXT) \
	  lib/stemmaweb/Controller/Stemma.pm $(INST_MAN3DIR)/stemmaweb::Controller::Stemma.$(MAN3EXT) \
	  lib/stemmaweb/Controller/Stemweb.pm $(INST_MAN3DIR)/stemmaweb::Controller::Stemweb.$(MAN3EXT) \
	  lib/stemmaweb/Controller/Stexaminer.pm $(INST_MAN3DIR)/stemmaweb::Controller::Stexaminer.$(MAN3EXT) \
	  lib/stemmaweb/Controller/Users.pm $(INST_MAN3DIR)/stemmaweb::Controller::Users.$(MAN3EXT) \
	  lib/stemmaweb/Controller/Util.pm $(INST_MAN3DIR)/stemmaweb::Controller::Util.$(MAN3EXT) \
	  lib/stemmaweb/Model/Stemma.pm $(INST_MAN3DIR)/stemmaweb::Model::Stemma.$(MAN3EXT) \
	  lib/stemmaweb/Model/StemmaUtil.pm $(INST_MAN3DIR)/stemmaweb::Model::StemmaUtil.$(MAN3EXT) \
	  lib/stemmaweb/View/CSV.pm $(INST_MAN3DIR)/stemmaweb::View::CSV.$(MAN3EXT) \
	  lib/stemmaweb/View/Email/Template.pm $(INST_MAN3DIR)/stemmaweb::View::Email::Template.$(MAN3EXT) \
	  lib/stemmaweb/View/JSON.pm $(INST_MAN3DIR)/stemmaweb::View::JSON.$(MAN3EXT) \
	  lib/stemmaweb/View/Plain.pm $(INST_MAN3DIR)/stemmaweb::View::Plain.$(MAN3EXT) \
	  lib/stemmaweb/View/TSV.pm $(INST_MAN3DIR)/stemmaweb::View::TSV.$(MAN3EXT) \
	  lib/stemmaweb/View/TT.pm $(INST_MAN3DIR)/stemmaweb::View::TT.$(MAN3EXT) 




# --- MakeMaker processPL section:


# --- MakeMaker installbin section:

EXE_FILES = script/n4jtestdb.pl script/stemmaweb_cgi.pl script/stemmaweb_create.pl script/stemmaweb_fastcgi.pl script/stemmaweb_server.pl script/stemmaweb_test.pl

pure_all :: $(INST_SCRIPT)/n4jtestdb.pl $(INST_SCRIPT)/stemmaweb_cgi.pl $(INST_SCRIPT)/stemmaweb_create.pl $(INST_SCRIPT)/stemmaweb_fastcgi.pl $(INST_SCRIPT)/stemmaweb_server.pl $(INST_SCRIPT)/stemmaweb_test.pl
	$(NOECHO) $(NOOP)

realclean ::
	$(RM_F) \
	  $(INST_SCRIPT)/n4jtestdb.pl $(INST_SCRIPT)/stemmaweb_cgi.pl \
	  $(INST_SCRIPT)/stemmaweb_create.pl $(INST_SCRIPT)/stemmaweb_fastcgi.pl \
	  $(INST_SCRIPT)/stemmaweb_server.pl $(INST_SCRIPT)/stemmaweb_test.pl 

$(INST_SCRIPT)/n4jtestdb.pl : script/n4jtestdb.pl $(FIRST_MAKEFILE) $(INST_SCRIPT)$(DFSEP).exists $(INST_BIN)$(DFSEP).exists
	$(NOECHO) $(RM_F) $(INST_SCRIPT)/n4jtestdb.pl
	$(CP) script/n4jtestdb.pl $(INST_SCRIPT)/n4jtestdb.pl
	$(FIXIN) $(INST_SCRIPT)/n4jtestdb.pl
	-$(NOECHO) $(CHMOD) $(PERM_RWX) $(INST_SCRIPT)/n4jtestdb.pl

$(INST_SCRIPT)/stemmaweb_cgi.pl : script/stemmaweb_cgi.pl $(FIRST_MAKEFILE) $(INST_SCRIPT)$(DFSEP).exists $(INST_BIN)$(DFSEP).exists
	$(NOECHO) $(RM_F) $(INST_SCRIPT)/stemmaweb_cgi.pl
	$(CP) script/stemmaweb_cgi.pl $(INST_SCRIPT)/stemmaweb_cgi.pl
	$(FIXIN) $(INST_SCRIPT)/stemmaweb_cgi.pl
	-$(NOECHO) $(CHMOD) $(PERM_RWX) $(INST_SCRIPT)/stemmaweb_cgi.pl

$(INST_SCRIPT)/stemmaweb_create.pl : script/stemmaweb_create.pl $(FIRST_MAKEFILE) $(INST_SCRIPT)$(DFSEP).exists $(INST_BIN)$(DFSEP).exists
	$(NOECHO) $(RM_F) $(INST_SCRIPT)/stemmaweb_create.pl
	$(CP) script/stemmaweb_create.pl $(INST_SCRIPT)/stemmaweb_create.pl
	$(FIXIN) $(INST_SCRIPT)/stemmaweb_create.pl
	-$(NOECHO) $(CHMOD) $(PERM_RWX) $(INST_SCRIPT)/stemmaweb_create.pl

$(INST_SCRIPT)/stemmaweb_fastcgi.pl : script/stemmaweb_fastcgi.pl $(FIRST_MAKEFILE) $(INST_SCRIPT)$(DFSEP).exists $(INST_BIN)$(DFSEP).exists
	$(NOECHO) $(RM_F) $(INST_SCRIPT)/stemmaweb_fastcgi.pl
	$(CP) script/stemmaweb_fastcgi.pl $(INST_SCRIPT)/stemmaweb_fastcgi.pl
	$(FIXIN) $(INST_SCRIPT)/stemmaweb_fastcgi.pl
	-$(NOECHO) $(CHMOD) $(PERM_RWX) $(INST_SCRIPT)/stemmaweb_fastcgi.pl

$(INST_SCRIPT)/stemmaweb_server.pl : script/stemmaweb_server.pl $(FIRST_MAKEFILE) $(INST_SCRIPT)$(DFSEP).exists $(INST_BIN)$(DFSEP).exists
	$(NOECHO) $(RM_F) $(INST_SCRIPT)/stemmaweb_server.pl
	$(CP) script/stemmaweb_server.pl $(INST_SCRIPT)/stemmaweb_server.pl
	$(FIXIN) $(INST_SCRIPT)/stemmaweb_server.pl
	-$(NOECHO) $(CHMOD) $(PERM_RWX) $(INST_SCRIPT)/stemmaweb_server.pl

$(INST_SCRIPT)/stemmaweb_test.pl : script/stemmaweb_test.pl $(FIRST_MAKEFILE) $(INST_SCRIPT)$(DFSEP).exists $(INST_BIN)$(DFSEP).exists
	$(NOECHO) $(RM_F) $(INST_SCRIPT)/stemmaweb_test.pl
	$(CP) script/stemmaweb_test.pl $(INST_SCRIPT)/stemmaweb_test.pl
	$(FIXIN) $(INST_SCRIPT)/stemmaweb_test.pl
	-$(NOECHO) $(CHMOD) $(PERM_RWX) $(INST_SCRIPT)/stemmaweb_test.pl



# --- MakeMaker subdirs section:

# none

# --- MakeMaker clean_subdirs section:
clean_subdirs :
	$(NOECHO) $(NOOP)


# --- MakeMaker clean section:

# Delete temporary files but do not touch installed files. We don't delete
# the Makefile here so a later make realclean still has a makefile to use.

clean :: clean_subdirs
	- $(RM_F) \
	  $(BASEEXT).bso $(BASEEXT).def \
	  $(BASEEXT).exp $(BASEEXT).x \
	  $(BOOTSTRAP) $(INST_ARCHAUTODIR)/extralibs.all \
	  $(INST_ARCHAUTODIR)/extralibs.ld $(MAKE_APERL_FILE) \
	  *$(LIB_EXT) *$(OBJ_EXT) \
	  *perl.core MYMETA.json \
	  MYMETA.yml blibdirs.ts \
	  core core.*perl.*.? \
	  core.[0-9] core.[0-9][0-9] \
	  core.[0-9][0-9][0-9] core.[0-9][0-9][0-9][0-9] \
	  core.[0-9][0-9][0-9][0-9][0-9] lib$(BASEEXT).def \
	  mon.out perl \
	  perl$(EXE_EXT) perl.exe \
	  perlmain.c pm_to_blib \
	  pm_to_blib.ts so_locations \
	  tmon.out 
	- $(RM_RF) \
	  blib 
	  $(NOECHO) $(RM_F) $(MAKEFILE_OLD)
	- $(MV) $(FIRST_MAKEFILE) $(MAKEFILE_OLD) $(DEV_NULL)


# --- MakeMaker realclean_subdirs section:
# so clean is forced to complete before realclean_subdirs runs
realclean_subdirs : clean
	$(NOECHO) $(NOOP)


# --- MakeMaker realclean section:
# Delete temporary files (via clean) and also delete dist files
realclean purge :: realclean_subdirs
	- $(RM_F) \
	  $(FIRST_MAKEFILE) $(MAKEFILE_OLD) 
	- $(RM_RF) \
	  $(DISTVNAME) MYMETA.yml 


# --- MakeMaker metafile section:
metafile :
	$(NOECHO) $(NOOP)


# --- MakeMaker signature section:
signature :
	cpansign -s


# --- MakeMaker dist_basics section:
distclean :: realclean distcheck
	$(NOECHO) $(NOOP)

distcheck :
	$(PERLRUN) "-MExtUtils::Manifest=fullcheck" -e fullcheck

skipcheck :
	$(PERLRUN) "-MExtUtils::Manifest=skipcheck" -e skipcheck

manifest :
	$(PERLRUN) "-MExtUtils::Manifest=mkmanifest" -e mkmanifest

veryclean : realclean
	$(RM_F) *~ */*~ *.orig */*.orig *.bak */*.bak *.old */*.old



# --- MakeMaker dist_core section:

dist : $(DIST_DEFAULT) $(FIRST_MAKEFILE)
	$(NOECHO) $(ABSPERLRUN) -l -e 'print '\''Warning: Makefile possibly out of date with $(VERSION_FROM)'\''' \
	  -e '    if -e '\''$(VERSION_FROM)'\'' and -M '\''$(VERSION_FROM)'\'' < -M '\''$(FIRST_MAKEFILE)'\'';' --

tardist : $(DISTVNAME).tar$(SUFFIX)
	$(NOECHO) $(NOOP)

uutardist : $(DISTVNAME).tar$(SUFFIX)
	uuencode $(DISTVNAME).tar$(SUFFIX) $(DISTVNAME).tar$(SUFFIX) > $(DISTVNAME).tar$(SUFFIX)_uu
	$(NOECHO) $(ECHO) 'Created $(DISTVNAME).tar$(SUFFIX)_uu'

$(DISTVNAME).tar$(SUFFIX) : distdir
	$(PREOP)
	$(TO_UNIX)
	$(TAR) $(TARFLAGS) $(DISTVNAME).tar $(DISTVNAME)
	$(RM_RF) $(DISTVNAME)
	$(COMPRESS) $(DISTVNAME).tar
	$(NOECHO) $(ECHO) 'Created $(DISTVNAME).tar$(SUFFIX)'
	$(POSTOP)

zipdist : $(DISTVNAME).zip
	$(NOECHO) $(NOOP)

$(DISTVNAME).zip : distdir
	$(PREOP)
	$(ZIP) $(ZIPFLAGS) $(DISTVNAME).zip $(DISTVNAME)
	$(RM_RF) $(DISTVNAME)
	$(NOECHO) $(ECHO) 'Created $(DISTVNAME).zip'
	$(POSTOP)

shdist : distdir
	$(PREOP)
	$(SHAR) $(DISTVNAME) > $(DISTVNAME).shar
	$(RM_RF) $(DISTVNAME)
	$(NOECHO) $(ECHO) 'Created $(DISTVNAME).shar'
	$(POSTOP)


# --- MakeMaker distdir section:
create_distdir :
	$(RM_RF) $(DISTVNAME)
	$(PERLRUN) "-MExtUtils::Manifest=manicopy,maniread" \
		-e "manicopy(maniread(),'$(DISTVNAME)', '$(DIST_CP)');"

distdir : create_distdir  
	$(NOECHO) $(NOOP)



# --- MakeMaker dist_test section:
disttest : distdir
	cd $(DISTVNAME) && $(ABSPERLRUN) Makefile.PL 
	cd $(DISTVNAME) && $(MAKE) $(PASTHRU)
	cd $(DISTVNAME) && $(MAKE) test $(PASTHRU)



# --- MakeMaker dist_ci section:
ci :
	$(ABSPERLRUN) -MExtUtils::Manifest=maniread -e '@all = sort keys %{ maniread() };' \
	  -e 'print(qq{Executing $(CI) @all\n});' \
	  -e 'system(qq{$(CI) @all}) == 0 or die $$!;' \
	  -e 'print(qq{Executing $(RCS_LABEL) ...\n});' \
	  -e 'system(qq{$(RCS_LABEL) @all}) == 0 or die $$!;' --


# --- MakeMaker distmeta section:
distmeta : create_distdir metafile
	$(NOECHO) cd $(DISTVNAME) && $(ABSPERLRUN) -MExtUtils::Manifest=maniadd -e 'exit unless -e q{META.yml};' \
	  -e 'eval { maniadd({q{META.yml} => q{Module YAML meta-data (added by MakeMaker)}}) }' \
	  -e '    or die "Could not add META.yml to MANIFEST: $${'\''@'\''}"' --
	$(NOECHO) cd $(DISTVNAME) && $(ABSPERLRUN) -MExtUtils::Manifest=maniadd -e 'exit unless -f q{META.json};' \
	  -e 'eval { maniadd({q{META.json} => q{Module JSON meta-data (added by MakeMaker)}}) }' \
	  -e '    or die "Could not add META.json to MANIFEST: $${'\''@'\''}"' --



# --- MakeMaker distsignature section:
distsignature : distmeta
	$(NOECHO) cd $(DISTVNAME) && $(ABSPERLRUN) -MExtUtils::Manifest=maniadd -e 'eval { maniadd({q{SIGNATURE} => q{Public-key signature (added by MakeMaker)}}) }' \
	  -e '    or die "Could not add SIGNATURE to MANIFEST: $${'\''@'\''}"' --
	$(NOECHO) cd $(DISTVNAME) && $(TOUCH) SIGNATURE
	cd $(DISTVNAME) && cpansign -s



# --- MakeMaker install section:

install :: pure_install doc_install
	$(NOECHO) $(NOOP)

install_perl :: pure_perl_install doc_perl_install
	$(NOECHO) $(NOOP)

install_site :: pure_site_install doc_site_install
	$(NOECHO) $(NOOP)

install_vendor :: pure_vendor_install doc_vendor_install
	$(NOECHO) $(NOOP)

pure_install :: pure_$(INSTALLDIRS)_install
	$(NOECHO) $(NOOP)

doc_install :: doc_$(INSTALLDIRS)_install
	$(NOECHO) $(NOOP)

pure__install : pure_site_install
	$(NOECHO) $(ECHO) INSTALLDIRS not defined, defaulting to INSTALLDIRS=site

doc__install : doc_site_install
	$(NOECHO) $(ECHO) INSTALLDIRS not defined, defaulting to INSTALLDIRS=site

pure_perl_install :: all
	$(NOECHO) $(MOD_INSTALL) \
		read "$(PERL_ARCHLIB)/auto/$(FULLEXT)/.packlist" \
		write "$(DESTINSTALLARCHLIB)/auto/$(FULLEXT)/.packlist" \
		"$(INST_LIB)" "$(DESTINSTALLPRIVLIB)" \
		"$(INST_ARCHLIB)" "$(DESTINSTALLARCHLIB)" \
		"$(INST_BIN)" "$(DESTINSTALLBIN)" \
		"$(INST_SCRIPT)" "$(DESTINSTALLSCRIPT)" \
		"$(INST_MAN1DIR)" "$(DESTINSTALLMAN1DIR)" \
		"$(INST_MAN3DIR)" "$(DESTINSTALLMAN3DIR)"
	$(NOECHO) $(WARN_IF_OLD_PACKLIST) \
		"$(SITEARCHEXP)/auto/$(FULLEXT)"


pure_site_install :: all
	$(NOECHO) $(MOD_INSTALL) \
		read "$(SITEARCHEXP)/auto/$(FULLEXT)/.packlist" \
		write "$(DESTINSTALLSITEARCH)/auto/$(FULLEXT)/.packlist" \
		"$(INST_LIB)" "$(DESTINSTALLSITELIB)" \
		"$(INST_ARCHLIB)" "$(DESTINSTALLSITEARCH)" \
		"$(INST_BIN)" "$(DESTINSTALLSITEBIN)" \
		"$(INST_SCRIPT)" "$(DESTINSTALLSITESCRIPT)" \
		"$(INST_MAN1DIR)" "$(DESTINSTALLSITEMAN1DIR)" \
		"$(INST_MAN3DIR)" "$(DESTINSTALLSITEMAN3DIR)"
	$(NOECHO) $(WARN_IF_OLD_PACKLIST) \
		"$(PERL_ARCHLIB)/auto/$(FULLEXT)"

pure_vendor_install :: all
	$(NOECHO) $(MOD_INSTALL) \
		read "$(VENDORARCHEXP)/auto/$(FULLEXT)/.packlist" \
		write "$(DESTINSTALLVENDORARCH)/auto/$(FULLEXT)/.packlist" \
		"$(INST_LIB)" "$(DESTINSTALLVENDORLIB)" \
		"$(INST_ARCHLIB)" "$(DESTINSTALLVENDORARCH)" \
		"$(INST_BIN)" "$(DESTINSTALLVENDORBIN)" \
		"$(INST_SCRIPT)" "$(DESTINSTALLVENDORSCRIPT)" \
		"$(INST_MAN1DIR)" "$(DESTINSTALLVENDORMAN1DIR)" \
		"$(INST_MAN3DIR)" "$(DESTINSTALLVENDORMAN3DIR)"


doc_perl_install :: all
	$(NOECHO) $(ECHO) Appending installation info to "$(DESTINSTALLARCHLIB)/perllocal.pod"
	-$(NOECHO) $(MKPATH) "$(DESTINSTALLARCHLIB)"
	-$(NOECHO) $(DOC_INSTALL) \
		"Module" "$(NAME)" \
		"installed into" "$(INSTALLPRIVLIB)" \
		LINKTYPE "$(LINKTYPE)" \
		VERSION "$(VERSION)" \
		EXE_FILES "$(EXE_FILES)" \
		>> "$(DESTINSTALLARCHLIB)/perllocal.pod"

doc_site_install :: all
	$(NOECHO) $(ECHO) Appending installation info to "$(DESTINSTALLARCHLIB)/perllocal.pod"
	-$(NOECHO) $(MKPATH) "$(DESTINSTALLARCHLIB)"
	-$(NOECHO) $(DOC_INSTALL) \
		"Module" "$(NAME)" \
		"installed into" "$(INSTALLSITELIB)" \
		LINKTYPE "$(LINKTYPE)" \
		VERSION "$(VERSION)" \
		EXE_FILES "$(EXE_FILES)" \
		>> "$(DESTINSTALLARCHLIB)/perllocal.pod"

doc_vendor_install :: all
	$(NOECHO) $(ECHO) Appending installation info to "$(DESTINSTALLARCHLIB)/perllocal.pod"
	-$(NOECHO) $(MKPATH) "$(DESTINSTALLARCHLIB)"
	-$(NOECHO) $(DOC_INSTALL) \
		"Module" "$(NAME)" \
		"installed into" "$(INSTALLVENDORLIB)" \
		LINKTYPE "$(LINKTYPE)" \
		VERSION "$(VERSION)" \
		EXE_FILES "$(EXE_FILES)" \
		>> "$(DESTINSTALLARCHLIB)/perllocal.pod"


uninstall :: uninstall_from_$(INSTALLDIRS)dirs
	$(NOECHO) $(NOOP)

uninstall_from_perldirs ::
	$(NOECHO) $(UNINSTALL) "$(PERL_ARCHLIB)/auto/$(FULLEXT)/.packlist"

uninstall_from_sitedirs ::
	$(NOECHO) $(UNINSTALL) "$(SITEARCHEXP)/auto/$(FULLEXT)/.packlist"

uninstall_from_vendordirs ::
	$(NOECHO) $(UNINSTALL) "$(VENDORARCHEXP)/auto/$(FULLEXT)/.packlist"


# --- MakeMaker force section:
# Phony target to force checking subdirectories.
FORCE :
	$(NOECHO) $(NOOP)


# --- MakeMaker perldepend section:


# --- MakeMaker makefile section:
# We take a very conservative approach here, but it's worth it.
# We move Makefile to Makefile.old here to avoid gnu make looping.
$(FIRST_MAKEFILE) : Makefile.PL $(CONFIGDEP)
	$(NOECHO) $(ECHO) "Makefile out-of-date with respect to $?"
	$(NOECHO) $(ECHO) "Cleaning current config before rebuilding Makefile..."
	-$(NOECHO) $(RM_F) $(MAKEFILE_OLD)
	-$(NOECHO) $(MV)   $(FIRST_MAKEFILE) $(MAKEFILE_OLD)
	- $(MAKE) $(USEMAKEFILE) $(MAKEFILE_OLD) clean $(DEV_NULL)
	$(PERLRUN) Makefile.PL 
	$(NOECHO) $(ECHO) "==> Your Makefile has been rebuilt. <=="
	$(NOECHO) $(ECHO) "==> Please rerun the $(MAKE) command.  <=="
	$(FALSE)



# --- MakeMaker staticmake section:

# --- MakeMaker makeaperl section ---
MAP_TARGET    = perl
FULLPERL      = "/usr/bin/perl"
MAP_PERLINC   = "-Iblib/arch" "-Iblib/lib" "-I/System/Library/Perl/5.30/darwin-thread-multi-2level" "-I/System/Library/Perl/5.30"

$(MAP_TARGET) :: $(MAKE_APERL_FILE)
	$(MAKE) $(USEMAKEFILE) $(MAKE_APERL_FILE) $@

$(MAKE_APERL_FILE) : static $(FIRST_MAKEFILE) pm_to_blib
	$(NOECHO) $(ECHO) Writing \"$(MAKE_APERL_FILE)\" for this $(MAP_TARGET)
	$(NOECHO) $(PERLRUNINST) \
		Makefile.PL DIR="" \
		MAKEFILE=$(MAKE_APERL_FILE) LINKTYPE=static \
		MAKEAPERL=1 NORECURS=1 CCCDLFLAGS=


# --- MakeMaker test section:
TEST_VERBOSE=0
TEST_TYPE=test_$(LINKTYPE)
TEST_FILE = test.pl
TEST_FILES = t/00cert.t t/01app.t t/02pod.t t/03podcoverage.t t/04login.t t/05register.t t/06openid.t t/07google.t t/controller_Relation.t t/controller_Root.t t/controller_Stemma.t t/controller_Stemweb.t t/controller_Users.t t/controller_Util.t t/model_Directory.t t/model_Stemma.t t/view_CSV.t t/view_Email-Template.t t/view_JSON.t t/view_TSV.t t/view_TT.t
TESTDB_SW = -d

testdb :: testdb_$(LINKTYPE)
	$(NOECHO) $(NOOP)

test :: $(TEST_TYPE)
	$(NOECHO) $(NOOP)

# Occasionally we may face this degenerate target:
test_ : test_dynamic
	$(NOECHO) $(NOOP)

subdirs-test_dynamic :: dynamic pure_all

test_dynamic :: subdirs-test_dynamic
	PERL_DL_NONLAZY=1 $(FULLPERLRUN) "-MExtUtils::Command::MM" "-MTest::Harness" "-e" "undef *Test::Harness::Switches; test_harness($(TEST_VERBOSE), 'inc', '$(INST_LIB)', '$(INST_ARCHLIB)')" $(TEST_FILES)

testdb_dynamic :: dynamic pure_all
	PERL_DL_NONLAZY=1 $(FULLPERLRUN) $(TESTDB_SW) "-Iinc" "-I$(INST_LIB)" "-I$(INST_ARCHLIB)" $(TEST_FILE)

subdirs-test_static :: static pure_all

test_static :: subdirs-test_static
	PERL_DL_NONLAZY=1 $(FULLPERLRUN) "-MExtUtils::Command::MM" "-MTest::Harness" "-e" "undef *Test::Harness::Switches; test_harness($(TEST_VERBOSE), '$(INST_LIB)', '$(INST_ARCHLIB)')" $(TEST_FILES)

testdb_static :: static pure_all
	PERL_DL_NONLAZY=1 $(FULLPERLRUN) $(TESTDB_SW) "-Iinc" "-I$(INST_LIB)" "-I$(INST_ARCHLIB)" $(TEST_FILE)



# --- MakeMaker ppd section:
# Creates a PPD (Perl Package Description) for a binary distribution.
ppd :
	$(NOECHO) $(ECHO) '<SOFTPKG NAME="stemmaweb" VERSION="0.01">' > stemmaweb.ppd
	$(NOECHO) $(ECHO) '    <ABSTRACT>Catalyst based application</ABSTRACT>' >> stemmaweb.ppd
	$(NOECHO) $(ECHO) '    <AUTHOR>Tara L Andrews</AUTHOR>' >> stemmaweb.ppd
	$(NOECHO) $(ECHO) '    <IMPLEMENTATION>' >> stemmaweb.ppd
	$(NOECHO) $(ECHO) '        <REQUIRE NAME="Bio::Phylo::IO" />' >> stemmaweb.ppd
	$(NOECHO) $(ECHO) '        <REQUIRE NAME="Cache::FileCache" />' >> stemmaweb.ppd
	$(NOECHO) $(ECHO) '        <REQUIRE NAME="Catalyst::Action::RenderView" />' >> stemmaweb.ppd
	$(NOECHO) $(ECHO) '        <REQUIRE NAME="Catalyst::Authentication::Credential::OpenID" />' >> stemmaweb.ppd
	$(NOECHO) $(ECHO) '        <REQUIRE NAME="Catalyst::Plugin::Authentication" />' >> stemmaweb.ppd
	$(NOECHO) $(ECHO) '        <REQUIRE NAME="Catalyst::Plugin::Cache" />' >> stemmaweb.ppd
	$(NOECHO) $(ECHO) '        <REQUIRE NAME="Catalyst::Plugin::ConfigLoader" />' >> stemmaweb.ppd
	$(NOECHO) $(ECHO) '        <REQUIRE NAME="Catalyst::Plugin::Session" />' >> stemmaweb.ppd
	$(NOECHO) $(ECHO) '        <REQUIRE NAME="Catalyst::Plugin::Session::State::Cookie" />' >> stemmaweb.ppd
	$(NOECHO) $(ECHO) '        <REQUIRE NAME="Catalyst::Plugin::Session::Store::File" />' >> stemmaweb.ppd
	$(NOECHO) $(ECHO) '        <REQUIRE NAME="Catalyst::Plugin::StackTrace" />' >> stemmaweb.ppd
	$(NOECHO) $(ECHO) '        <REQUIRE NAME="Catalyst::Plugin::Static::Simple" />' >> stemmaweb.ppd
	$(NOECHO) $(ECHO) '        <REQUIRE NAME="Catalyst::Plugin::Unicode::Encoding" />' >> stemmaweb.ppd
	$(NOECHO) $(ECHO) '        <REQUIRE NAME="Catalyst::Runtime" VERSION="5.90126" />' >> stemmaweb.ppd
	$(NOECHO) $(ECHO) '        <REQUIRE NAME="Catalyst::TraitFor::Controller::reCAPTCHA" />' >> stemmaweb.ppd
	$(NOECHO) $(ECHO) '        <REQUIRE NAME="Catalyst::TraitFor::Request::ProxyBase" />' >> stemmaweb.ppd
	$(NOECHO) $(ECHO) '        <REQUIRE NAME="Catalyst::View::Download::Plain" />' >> stemmaweb.ppd
	$(NOECHO) $(ECHO) '        <REQUIRE NAME="Catalyst::View::Email::Template" />' >> stemmaweb.ppd
	$(NOECHO) $(ECHO) '        <REQUIRE NAME="Catalyst::View::JSON" />' >> stemmaweb.ppd
	$(NOECHO) $(ECHO) '        <REQUIRE NAME="Catalyst::View::TT" />' >> stemmaweb.ppd
	$(NOECHO) $(ECHO) '        <REQUIRE NAME="CatalystX::Controller::Auth" VERSION="0.22" />' >> stemmaweb.ppd
	$(NOECHO) $(ECHO) '        <REQUIRE NAME="Config::General" />' >> stemmaweb.ppd
	$(NOECHO) $(ECHO) '        <REQUIRE NAME="Crypt::OpenSSL::RSA" />' >> stemmaweb.ppd
	$(NOECHO) $(ECHO) '        <REQUIRE NAME="Crypt::OpenSSL::X509" />' >> stemmaweb.ppd
	$(NOECHO) $(ECHO) '        <REQUIRE NAME="Date::Parse" />' >> stemmaweb.ppd
	$(NOECHO) $(ECHO) '        <REQUIRE NAME="Digest::SHA256" />' >> stemmaweb.ppd
	$(NOECHO) $(ECHO) '        <REQUIRE NAME="File::Temp" />' >> stemmaweb.ppd
	$(NOECHO) $(ECHO) '        <REQUIRE NAME="File::Which" />' >> stemmaweb.ppd
	$(NOECHO) $(ECHO) '        <REQUIRE NAME="File::chdir" />' >> stemmaweb.ppd
	$(NOECHO) $(ECHO) '        <REQUIRE NAME="Graph::" />' >> stemmaweb.ppd
	$(NOECHO) $(ECHO) '        <REQUIRE NAME="Graph::Reader::Dot" />' >> stemmaweb.ppd
	$(NOECHO) $(ECHO) '        <REQUIRE NAME="IO::All" />' >> stemmaweb.ppd
	$(NOECHO) $(ECHO) '        <REQUIRE NAME="IPC::Run" />' >> stemmaweb.ppd
	$(NOECHO) $(ECHO) '        <REQUIRE NAME="IPC::System::Simple" />' >> stemmaweb.ppd
	$(NOECHO) $(ECHO) '        <REQUIRE NAME="JSON::WebToken" />' >> stemmaweb.ppd
	$(NOECHO) $(ECHO) '        <REQUIRE NAME="JSON::XS" />' >> stemmaweb.ppd
	$(NOECHO) $(ECHO) '        <REQUIRE NAME="LWP::Protocol::PSGI" />' >> stemmaweb.ppd
	$(NOECHO) $(ECHO) '        <REQUIRE NAME="LWP::Protocol::https" />' >> stemmaweb.ppd
	$(NOECHO) $(ECHO) '        <REQUIRE NAME="List::Util" />' >> stemmaweb.ppd
	$(NOECHO) $(ECHO) '        <REQUIRE NAME="MIME::Base64" />' >> stemmaweb.ppd
	$(NOECHO) $(ECHO) '        <REQUIRE NAME="Moose::" />' >> stemmaweb.ppd
	$(NOECHO) $(ECHO) '        <REQUIRE NAME="Plack::Middleware::ReverseProxyPath" />' >> stemmaweb.ppd
	$(NOECHO) $(ECHO) '        <REQUIRE NAME="Test::More" VERSION="0.88" />' >> stemmaweb.ppd
	$(NOECHO) $(ECHO) '        <REQUIRE NAME="Test::WWW::Mechanize" />' >> stemmaweb.ppd
	$(NOECHO) $(ECHO) '        <REQUIRE NAME="Throwable::X" />' >> stemmaweb.ppd
	$(NOECHO) $(ECHO) '        <REQUIRE NAME="TryCatch::" />' >> stemmaweb.ppd
	$(NOECHO) $(ECHO) '        <REQUIRE NAME="URI::Escape" />' >> stemmaweb.ppd
	$(NOECHO) $(ECHO) '        <REQUIRE NAME="XML::LibXML" />' >> stemmaweb.ppd
	$(NOECHO) $(ECHO) '        <REQUIRE NAME="namespace::autoclean" />' >> stemmaweb.ppd
	$(NOECHO) $(ECHO) '        <REQUIRE NAME="strictures::" />' >> stemmaweb.ppd
	$(NOECHO) $(ECHO) '        <ARCHITECTURE NAME="darwin-thread-multi-2level-5.30" />' >> stemmaweb.ppd
	$(NOECHO) $(ECHO) '        <CODEBASE HREF="" />' >> stemmaweb.ppd
	$(NOECHO) $(ECHO) '    </IMPLEMENTATION>' >> stemmaweb.ppd
	$(NOECHO) $(ECHO) '</SOFTPKG>' >> stemmaweb.ppd


# --- MakeMaker pm_to_blib section:

pm_to_blib : $(FIRST_MAKEFILE) $(TO_INST_PM)
	$(NOECHO) $(ABSPERLRUN) -MExtUtils::Install -e 'pm_to_blib({@ARGV}, '\''$(INST_LIB)/auto'\'', q[$(PM_FILTER)], '\''$(PERM_DIR)'\'')' -- \
	  'lib/Catalyst/Authentication/Store/Neo4p.pm' 'blib/lib/Catalyst/Authentication/Store/Neo4p.pm' \
	  'lib/Catalyst/Authentication/Store/Neo4p/User.pm' 'blib/lib/Catalyst/Authentication/Store/Neo4p/User.pm' \
	  'lib/String/Diff.pm' 'blib/lib/String/Diff.pm' \
	  'lib/stemmaweb.pm' 'blib/lib/stemmaweb.pm' \
	  'lib/stemmaweb/Authentication/Credential/Google.pm' 'blib/lib/stemmaweb/Authentication/Credential/Google.pm' \
	  'lib/stemmaweb/Authentication/FormHandler.pm' 'blib/lib/stemmaweb/Authentication/FormHandler.pm' \
	  'lib/stemmaweb/Controller/Relation.pm' 'blib/lib/stemmaweb/Controller/Relation.pm' \
	  'lib/stemmaweb/Controller/Root.pm' 'blib/lib/stemmaweb/Controller/Root.pm' \
	  'lib/stemmaweb/Controller/Stemma.pm' 'blib/lib/stemmaweb/Controller/Stemma.pm' \
	  'lib/stemmaweb/Controller/Stemweb.pm' 'blib/lib/stemmaweb/Controller/Stemweb.pm' \
	  'lib/stemmaweb/Controller/Stexaminer.pm' 'blib/lib/stemmaweb/Controller/Stexaminer.pm' \
	  'lib/stemmaweb/Controller/Users.pm' 'blib/lib/stemmaweb/Controller/Users.pm' \
	  'lib/stemmaweb/Controller/Util.pm' 'blib/lib/stemmaweb/Controller/Util.pm' \
	  'lib/stemmaweb/Error.pm' 'blib/lib/stemmaweb/Error.pm' \
	  'lib/stemmaweb/Model/Directory.pm' 'blib/lib/stemmaweb/Model/Directory.pm' \
	  'lib/stemmaweb/Model/Stemma.pm' 'blib/lib/stemmaweb/Model/Stemma.pm' \
	  'lib/stemmaweb/Model/StemmaUtil.pm' 'blib/lib/stemmaweb/Model/StemmaUtil.pm' \
	  'lib/stemmaweb/View/CSV.pm' 'blib/lib/stemmaweb/View/CSV.pm' \
	  'lib/stemmaweb/View/Email/Template.pm' 'blib/lib/stemmaweb/View/Email/Template.pm' \
	  'lib/stemmaweb/View/GraphML.pm' 'blib/lib/stemmaweb/View/GraphML.pm' \
	  'lib/stemmaweb/View/JSON.pm' 'blib/lib/stemmaweb/View/JSON.pm' \
	  'lib/stemmaweb/View/Plain.pm' 'blib/lib/stemmaweb/View/Plain.pm' \
	  'lib/stemmaweb/View/SVG.pm' 'blib/lib/stemmaweb/View/SVG.pm' \
	  'lib/stemmaweb/View/TSV.pm' 'blib/lib/stemmaweb/View/TSV.pm' \
	  'lib/stemmaweb/View/TT.pm' 'blib/lib/stemmaweb/View/TT.pm' 
	$(NOECHO) $(TOUCH) pm_to_blib


# --- MakeMaker selfdocument section:

# here so even if top_targets is overridden, these will still be defined
# gmake will silently still work if any are .PHONY-ed but nmake won't

static ::
	$(NOECHO) $(NOOP)

dynamic ::
	$(NOECHO) $(NOOP)

config ::
	$(NOECHO) $(NOOP)


# --- MakeMaker postamble section:


# End.
# Postamble by Module::Install 1.19
# --- Module::Install::Admin::Makefile section:

realclean purge ::
	$(RM_F) $(DISTVNAME).tar$(SUFFIX)
	$(RM_F) MANIFEST.bak _build
	$(PERL) "-Ilib" "-MModule::Install::Admin" -e "remove_meta()"
	$(RM_RF) inc

reset :: purge

upload :: test dist
	cpan-upload -verbose $(DISTVNAME).tar$(SUFFIX)

grok ::
	perldoc Module::Install

distsign ::
	cpansign -s

# --- Module::Install::AutoInstall section:

config :: installdeps
	$(NOECHO) $(NOOP)

checkdeps ::
	$(PERL) Makefile.PL --checkdeps

installdeps ::
	$(NOECHO) $(NOOP)

installdeps_notest ::
	$(NOECHO) $(NOOP)

upgradedeps ::
	$(PERL) Makefile.PL --config= --upgradedeps=Catalyst::Authentication::Credential::OpenID,0,Test::More,0.88,LWP::Protocol::PSGI,0,Test::WWW::Mechanize,0,IPC::System::Simple,0,Config::General,0,Catalyst::Runtime,5.90126,Catalyst::Plugin::Cache,0,Catalyst::Plugin::ConfigLoader,0,Catalyst::Plugin::StackTrace,0,Catalyst::Plugin::Static::Simple,0,Catalyst::Plugin::Unicode::Encoding,0,Catalyst::Action::RenderView,0,Catalyst::View::Download::Plain,0,Catalyst::View::JSON,0,Catalyst::View::TT,0,Catalyst::View::Email::Template,0,Plack::Middleware::ReverseProxyPath,0,Catalyst::Plugin::Authentication,0,Catalyst::Plugin::Session,0,Catalyst::Plugin::Session::Store::File,0,Catalyst::Plugin::Session::State::Cookie,0,CatalystX::Controller::Auth,0.22,Catalyst::TraitFor::Request::ProxyBase,0,Catalyst::TraitFor::Controller::reCAPTCHA,0,LWP::Protocol::https,0,Bio::Phylo::IO,0,Cache::FileCache,0,Crypt::OpenSSL::X509,0,Crypt::OpenSSL::RSA,0,Date::Parse,0,Digest::SHA256,0,File::chdir,0,File::Temp,0,File::Which,0,Graph,0,Graph::Reader::Dot,0,IO::All,0,IPC::Run,0,JSON::WebToken,0,JSON::XS,0,List::Util,0,LWP::Protocol::https,0,MIME::Base64,0,Moose,0,strictures,2,Throwable::X,0,TryCatch,0,URI::Escape,0,XML::LibXML,0,namespace::autoclean,0,strictures,0

upgradedeps_notest ::
	$(PERL) Makefile.PL --config=notest,1 --upgradedeps=Catalyst::Authentication::Credential::OpenID,0,Test::More,0.88,LWP::Protocol::PSGI,0,Test::WWW::Mechanize,0,IPC::System::Simple,0,Config::General,0,Catalyst::Runtime,5.90126,Catalyst::Plugin::Cache,0,Catalyst::Plugin::ConfigLoader,0,Catalyst::Plugin::StackTrace,0,Catalyst::Plugin::Static::Simple,0,Catalyst::Plugin::Unicode::Encoding,0,Catalyst::Action::RenderView,0,Catalyst::View::Download::Plain,0,Catalyst::View::JSON,0,Catalyst::View::TT,0,Catalyst::View::Email::Template,0,Plack::Middleware::ReverseProxyPath,0,Catalyst::Plugin::Authentication,0,Catalyst::Plugin::Session,0,Catalyst::Plugin::Session::Store::File,0,Catalyst::Plugin::Session::State::Cookie,0,CatalystX::Controller::Auth,0.22,Catalyst::TraitFor::Request::ProxyBase,0,Catalyst::TraitFor::Controller::reCAPTCHA,0,LWP::Protocol::https,0,Bio::Phylo::IO,0,Cache::FileCache,0,Crypt::OpenSSL::X509,0,Crypt::OpenSSL::RSA,0,Date::Parse,0,Digest::SHA256,0,File::chdir,0,File::Temp,0,File::Which,0,Graph,0,Graph::Reader::Dot,0,IO::All,0,IPC::Run,0,JSON::WebToken,0,JSON::XS,0,List::Util,0,LWP::Protocol::https,0,MIME::Base64,0,Moose,0,strictures,2,Throwable::X,0,TryCatch,0,URI::Escape,0,XML::LibXML,0,namespace::autoclean,0,strictures,0

listdeps ::
	@$(PERL) -le "print for @ARGV" Catalyst::Authentication::Credential::OpenID

listalldeps ::
	@$(PERL) -le "print for @ARGV" Catalyst::Authentication::Credential::OpenID Test::More LWP::Protocol::PSGI Test::WWW::Mechanize IPC::System::Simple Config::General Catalyst::Runtime Catalyst::Plugin::Cache Catalyst::Plugin::ConfigLoader Catalyst::Plugin::StackTrace Catalyst::Plugin::Static::Simple Catalyst::Plugin::Unicode::Encoding Catalyst::Action::RenderView Catalyst::View::Download::Plain Catalyst::View::JSON Catalyst::View::TT Catalyst::View::Email::Template Plack::Middleware::ReverseProxyPath Catalyst::Plugin::Authentication Catalyst::Plugin::Session Catalyst::Plugin::Session::Store::File Catalyst::Plugin::Session::State::Cookie CatalystX::Controller::Auth Catalyst::TraitFor::Request::ProxyBase Catalyst::TraitFor::Controller::reCAPTCHA LWP::Protocol::https Bio::Phylo::IO Cache::FileCache Crypt::OpenSSL::X509 Crypt::OpenSSL::RSA Date::Parse Digest::SHA256 File::chdir File::Temp File::Which Graph Graph::Reader::Dot IO::All IPC::Run JSON::WebToken JSON::XS List::Util LWP::Protocol::https MIME::Base64 Moose strictures Throwable::X TryCatch URI::Escape XML::LibXML namespace::autoclean strictures

