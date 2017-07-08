FROM ubuntu:14.04
MAINTAINER Tara L Andrews <tla@mit.edu>
RUN apt-get update && apt-get install -y gcc \
	make \
	libxml2-dev \
	zlib1g-dev \
	libexpat1-dev \
	graphviz \
	libssl-dev \
	libgmp-dev \
	git
RUN cpan -T App::cpanminus Module::Install::Catalyst 
RUN git clone https://github.com/tla/stemmaweb.git
RUN cd stemmaweb && cpanm -n --installdeps .
RUN git clone https://github.com/tla/stemmatology.git
RUN cd stemmatology/base && perl Makefile.PL && make && make install && make distclean
WORKDIR "/stemmaweb"
RUN script/maketestdb.pl
CMD script/stemmaweb_server.pl
