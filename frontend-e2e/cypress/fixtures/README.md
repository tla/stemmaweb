# Fixtures

`armexample.*` are the same small collation (witnesses B, D and Q, which belong to the
Florilegium; 8 alignment columns) in each format the "add a section" upload accepts.
`section-upload.cy.js` uploads each and checks the text Stemmarest reconstructs per witness.

| File | Upload type |
|---|---|
| `armexample.csv` | csv |
| `armexample.tsv` | tsv |
| `armexample.xls` | xls |
| `armexample.xlsx` | xlsx (the upload dialog does not offer this type yet) |
| `armexample.collatex.xml` | collatex (CollateX GraphML output) |
| `armexample.cx.json` | cxjson (CollateX JSON output) |
| `armexample.zip` | graphml (native GraphML export: `tradition.xml` plus one section file) |

`matthew401.graphml.zip` is a native GraphML export holding a tradition with two stemmata; `empty-directory.cy.js` uploads it to add a tradition that has a stemma.

Not yet covered (no sample file): `teips`, `cte`, `stemmaweb`.
