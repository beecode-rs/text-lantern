# lib/clean.pl — strip non-speakable junk before synthesis.
#
# Reads text from stdin, writes cleaned text to stdout. Honors $STRIP:
#   unset (default): drop the bracket CHARACTERS but keep the inner text
#   set            : delete the bracketed CONTENT entirely
#
# Usage from speak.sh:  STRIP=$flag perl -0777 -CSD lib/clean.pl
use strict;
use warnings;
local $/;            # slurp whole input
$_ = <STDIN>;

# Fenced ```...``` and inline `...` code.
s/```.*?```//gs;
s/`[^`\n]*`//g;

# Markdown: drop images, keep link text.
s/!\[[^\]]*\]\([^)]*\)//g;
s/\[([^\]]+)\]\(([^)]*)\)/$1/g;

# HTML tags.
s/<[^>]+>//g;

# E-mail addresses.
s/\b[\w.+-]+\@[\w.-]+\.\w+\b//g;

# URLs: http(s)://…, www.…, and bare domain/path like example.com/foo.
s{\bhttps?://\S+}{}g;
s{\bwww\.\S+}{}g;
s{\b[a-z0-9][a-z0-9-]*(?:\.[a-z0-9][a-z0-9-]*)+(?:/\S*)?}{}gi;

# Citation / reference markers: [1] [12] [1a] [2, p. 4].
s/\[\s*\d+(?:\s*[,\-–.]?\s*[A-Za-z0-9.]*)*\s*\]//g;
# Wiki-style annotations: [citation needed] [edit] [sic] [note 3] …
s/\[(?:citation\s+needed|edit|sic|ref|fn\s+\d+|note\s+\d+|nb\s+\d+)\]//gi;

# Leading list markers, heading hashes, blockquote markers.
s/^[ \t]*([-*+]|\d+[.)]|#{1,6}|>)[ \t]*//gm;

# Brackets: delete content vs. drop just the characters.
if ($ENV{STRIP}) {
  s/\([^)]*\)//g; s/\[[^\]]*\]//g; s/\{[^}]*\}//g;
} else {
  tr/[](){}//d;
}

# Leftover markdown decoration -> space.
s/[*_~|>#]/ /g;

# Tidy whitespace; "word ." -> "word."; trim the whole block.
s/[ \t]+/ /g;
s/[ \t]+([.,;:!?])/$1/g;
s/\n[ \t]+/\n/g;
s/[ \t]+\n/\n/g;
s/\n{3,}/\n\n/g;
s/\A\s+//;
s/\s+\z//;

print;
