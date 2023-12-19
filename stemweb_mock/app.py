from flask import Flask, request
import time

app = Flask(__name__)

# Check that we are up
@app.get('/')
def index():
    return '<h1>Hello World!</h1>'

# Return the correct answer for "algorithms/available/"
@app.get('/algorithms/available/')
def available():
    return [
        {
            "pk": 4,
            "fields": {
                "name": "Estimate Arc Length",
                "key": "learnlength",
                "external": True,
                "value": "boolean"
            },
            "model": "algorithms.algorithmarg"
        },
        {
            "fields": {
                "external": False,
                "value": "boolean",
                "key": "radial",
                "name": "Radial Image Layout"
            },
            "pk": 8,
            "model": "algorithms.algorithmarg"
        },
        {
            "model": "algorithms.algorithmarg",
            "fields": {
                "external": False,
                "value": "input_file",
                "key": "infile",
                "name": "Input File"
            },
            "pk": 1
        },
        {
            "model": "algorithms.algorithmarg",
            "pk": 6,
            "fields": {
                "name": "Input File",
                "key": "infolder",
                "external": False,
                "value": "input_file"
            }
        },
        {
            "model": "algorithms.algorithmarg",
            "fields": {
                "name": "Input File",
                "key": "input_file",
                "external": False,
                "value": "input_file"
            },
            "pk": 5
        },
        {
            "model": "algorithms.algorithmarg",
            "fields": {
                "name": "Iterations",
                "external": True,
                "value": "positive_integer",
                "key": "imax"
            },
            "pk": 7
        },
        {
            "model": "algorithms.algorithmarg",
            "fields": {
                "key": "itermaxin",
                "external": True,
                "value": "positive_integer",
                "name": "Iterations"
            },
            "pk": 2
        },
        {
            "pk": 3,
            "fields": {
                "external": True,
                "value": "positive_integer",
                "key": "runmax",
                "name": "Runs"
            },
            "model": "algorithms.algorithmarg"
        },
        {
            "model": "algorithms.algorithm",
            "pk": 3,
            "fields": {
                "name": "Neighbour Joining",
                "args": [
                    8,
                    5
                ],
                "desc": "Neighbor-Joining (NJ) is a classical phylogenetic algorithm which operates in a bottom-up fashion, combining at each step two taxa or groups of taxa. Choosing which groups of taxa to combine is based on distances between the taxa. NJ is very fast and it is guaranteed to converge to the true underlying phylogenetic tree (or stemma) if one exists as the length of the sequences (or texts) increases. However, in practice it is often slightly less accurate than, for instance, maximum parsimony or RHM. Note that the version implemented in this server takes as input a set of sequences in Nexus format and computes their pairwise distances using Hamming distance (the number of differences divided by the length of the sequences). This may or may not be desirable. If another distance is preferred, or if for instance, a so called Jukes-Cantor correction is called for, it is necessary to use some other tools. NJ is available in most phylogenetic software tools."
            }
        },
        {
            "pk": 4,
            "fields": {
                "desc": "Neighbour Net algorithm",
                "args": [
                    5
                ],
                "name": "Neighbour Net"
            },
            "model": "algorithms.algorithm"
        },
        {
            "fields": {
                "desc": "The Roos-Heikkila-Myllymaki (RHM) method is similar to the maximum parsimony method. Both of them optimize a bifurcating tree structure to minimize a cost function. In RHM, the cost function is based on data compression which measures not only whether two variants are the same or not but also how different they are. The comparison is done in blocks of about ten words, which implies that change of word order is also handled in a sensible way: a change in word order will typically result in a smaller cost than changing the words into completely new ones. Because the comparison is based on the actual words, RHM requires that the actual text versions are given as the input in CSV (comma-separated values) format. RHM utilizes a stochastic search technique to minimize the cost of the stemma. The search procedure may easily get stuck in a suboptimal stemma unless the number of iterations is large enough. The best way to find out whether the number of iterations is large enough is to run RHM several times and to see if the resulting stemmata are similar or not. If not, it usually helps to increase the number of iterations. Note that it is often not possible to obtain identical stemmata in every run even if the number of iterations is very large.",
                "name": "RHM",
                "args": [
                    8,
                    6,
                    7
                ]
            },
            "pk": 2,
            "model": "algorithms.algorithm"
        },
        {
            "model": "algorithms.algorithm",
            "fields": {
                "desc": "The program \"pars\", from the Phylip bio-statistical software package, produces a maximum-parsimony distance tree of the witnesses. More information on maximum parsimony can be found <a href=\"https://wiki.hiit.fi/display/stemmatology/Maximum+parsimony\">here</a>. Please note that Phylip \"pars\" only supports a maximum of eight variants readings in any one variant location in the text. If your text displays more divergence than this at any point, please consider disregarding orthographic and spelling variation below, or use one of the other algorithms.",
                "args": [],
                "name": "Pars"
            },
            "pk": 100
        }
    ]


# Kick off an algorithm. Easter egg: only the NJ algorithm will get you a result.
@app.post('/algorithms/process/<algo>/')
def run_job(algo):
    if algo == '2':     # RHM: is running forever
        return {"jobid":2,"status":1}
    elif algo == '3':   # NJ: works
        return {"jobid":1,"status":1}
    elif algo == '4':   # NN: will error out
        return {"jobid":3,"status":1}


# Allow query of a job ID.
@app.get('/algorithms/jobstatus/<jobid>/')
def query_job(jobid):
    if jobid == '1':
        return {"jobid":1,"status":0,"result":{
            "stemmata": [
                {
                    "from_jobid": "1",
                    "name": "Neighbour Joining 1699013511_0",
                    "directed": False,
                    "svg": "<?xml version=\"1.0\" encoding=\"UTF-8\" standalone=\"no\"?> <!DOCTYPE svg PUBLIC \"-//W3C//DTD SVG 1.1//EN\"  \"http://www.w3.org/Graphics/SVG/1.1/DTD/svg11.dtd\"> <!-- Generated by graphviz version 3.0.0 (20221109.1736)  --> <!-- Title: Neighbour Joining 1699013511_0 Pages: 1 --> <svg width=\"677pt\" height=\"590pt\"  viewBox=\"0.00 0.00 676.61 589.98\" xmlns=\"http://www.w3.org/2000/svg\" xmlns:xlink=\"http://www.w3.org/1999/xlink\"> <g id=\"graph0\" class=\"graph\" transform=\"scale(1 1) rotate(0) translate(4 585.98)\"> <title>Neighbour Joining 1699013511_0</title> <!-- 22 --> <g id=\"22\" class=\"node\"> <title>22</title> <ellipse fill=\"white\" stroke=\"white\" cx=\"157.32\" cy=\"-116.71\" rx=\"27\" ry=\"18\"/> <text text-anchor=\"middle\" x=\"157.32\" y=\"-113.91\" font-family=\"Times,serif\" font-size=\"11.00\">22</text> </g> <!-- S --> <g id=\"S\" class=\"node\"> <title>S</title> <ellipse fill=\"white\" stroke=\"white\" cx=\"161.15\" cy=\"-35.67\" rx=\"27\" ry=\"18\"/> <text text-anchor=\"middle\" x=\"161.15\" y=\"-32.87\" font-family=\"Times,serif\" font-size=\"11.00\">S</text> </g> <!-- 22&#45;&#45;S --> <g id=\"edge1\" class=\"edge\"> <title>22&#45;&#45;S</title> <path fill=\"none\" stroke=\"black\" d=\"M158.19,-98.32C158.82,-84.96 159.67,-66.98 160.3,-53.7\"/> </g> <!-- D --> <g id=\"D\" class=\"node\"> <title>D</title> <ellipse fill=\"white\" stroke=\"white\" cx=\"87.35\" cy=\"-71.19\" rx=\"27\" ry=\"18\"/> <text text-anchor=\"middle\" x=\"87.35\" y=\"-68.39\" font-family=\"Times,serif\" font-size=\"11.00\">D</text> </g> <!-- 22&#45;&#45;D --> <g id=\"edge2\" class=\"edge\"> <title>22&#45;&#45;D</title> <path fill=\"none\" stroke=\"black\" d=\"M137.83,-104.03C128.12,-97.72 116.42,-90.11 106.73,-83.8\"/> </g> <!-- 18 --> <g id=\"18\" class=\"node\"> <title>18</title> <ellipse fill=\"white\" stroke=\"white\" cx=\"184.14\" cy=\"-199.82\" rx=\"27\" ry=\"18\"/> <text text-anchor=\"middle\" x=\"184.14\" y=\"-197.02\" font-family=\"Times,serif\" font-size=\"11.00\">18</text> </g> <!-- 22&#45;&#45;18 --> <g id=\"edge5\" class=\"edge\"> <title>22&#45;&#45;18</title> <path fill=\"none\" stroke=\"black\" d=\"M163,-134.33C167.56,-148.44 173.91,-168.12 178.46,-182.22\"/> </g> <!-- 19 --> <g id=\"19\" class=\"node\"> <title>19</title> <ellipse fill=\"white\" stroke=\"white\" cx=\"101.54\" cy=\"-219.23\" rx=\"27\" ry=\"18\"/> <text text-anchor=\"middle\" x=\"101.54\" y=\"-216.43\" font-family=\"Times,serif\" font-size=\"11.00\">19</text> </g> <!-- M --> <g id=\"M\" class=\"node\"> <title>M</title> <ellipse fill=\"white\" stroke=\"white\" cx=\"35.25\" cy=\"-263.51\" rx=\"27\" ry=\"18\"/> <text text-anchor=\"middle\" x=\"35.25\" y=\"-260.71\" font-family=\"Times,serif\" font-size=\"11.00\">M</text> </g> <!-- 19&#45;&#45;M --> <g id=\"edge3\" class=\"edge\"> <title>19&#45;&#45;M</title> <path fill=\"none\" stroke=\"black\" d=\"M82.36,-232.04C73.65,-237.86 63.35,-244.74 54.61,-250.57\"/> </g> <!-- C --> <g id=\"C\" class=\"node\"> <title>C</title> <ellipse fill=\"white\" stroke=\"white\" cx=\"27\" cy=\"-181.29\" rx=\"27\" ry=\"18\"/> <text text-anchor=\"middle\" x=\"27\" y=\"-178.49\" font-family=\"Times,serif\" font-size=\"11.00\">C</text> </g> <!-- 19&#45;&#45;C --> <g id=\"edge4\" class=\"edge\"> <title>19&#45;&#45;C</title> <path fill=\"none\" stroke=\"black\" d=\"M79.98,-208.26C70.09,-203.22 58.39,-197.27 48.51,-192.24\"/> </g> <!-- 19&#45;&#45;18 --> <g id=\"edge6\" class=\"edge\"> <title>19&#45;&#45;18</title> <path fill=\"none\" stroke=\"black\" d=\"M127.22,-213.2C137.17,-210.86 148.53,-208.19 158.47,-205.85\"/> </g> <!-- 12 --> <g id=\"12\" class=\"node\"> <title>12</title> <ellipse fill=\"white\" stroke=\"white\" cx=\"565.71\" cy=\"-91.8\" rx=\"27\" ry=\"18\"/> <text text-anchor=\"middle\" x=\"565.71\" y=\"-89\" font-family=\"Times,serif\" font-size=\"11.00\">12</text> </g> <!-- L --> <g id=\"L\" class=\"node\"> <title>L</title> <ellipse fill=\"white\" stroke=\"white\" cx=\"600.94\" cy=\"-18\" rx=\"27\" ry=\"18\"/> <text text-anchor=\"middle\" x=\"600.94\" y=\"-15.2\" font-family=\"Times,serif\" font-size=\"11.00\">L</text> </g> <!-- 12&#45;&#45;L --> <g id=\"edge7\" class=\"edge\"> <title>12&#45;&#45;L</title> <path fill=\"none\" stroke=\"black\" d=\"M574.06,-74.31C579.67,-62.55 587.05,-47.1 592.65,-35.36\"/> </g> <!-- B --> <g id=\"B\" class=\"node\"> <title>B</title> <ellipse fill=\"white\" stroke=\"white\" cx=\"641.61\" cy=\"-116.97\" rx=\"27\" ry=\"18\"/> <text text-anchor=\"middle\" x=\"641.61\" y=\"-114.17\" font-family=\"Times,serif\" font-size=\"11.00\">B</text> </g> <!-- 12&#45;&#45;B --> <g id=\"edge8\" class=\"edge\"> <title>12&#45;&#45;B</title> <path fill=\"none\" stroke=\"black\" d=\"M590.14,-99.9C598.81,-102.78 608.56,-106.01 617.22,-108.88\"/> </g> <!-- 11 --> <g id=\"11\" class=\"node\"> <title>11</title> <ellipse fill=\"white\" stroke=\"white\" cx=\"483.8\" cy=\"-110.42\" rx=\"27\" ry=\"18\"/> <text text-anchor=\"middle\" x=\"483.8\" y=\"-107.62\" font-family=\"Times,serif\" font-size=\"11.00\">11</text> </g> <!-- 11&#45;&#45;12 --> <g id=\"edge10\" class=\"edge\"> <title>11&#45;&#45;12</title> <path fill=\"none\" stroke=\"black\" d=\"M509.72,-104.53C519.37,-102.33 530.32,-99.85 539.96,-97.65\"/> </g> <!-- U --> <g id=\"U\" class=\"node\"> <title>U</title> <ellipse fill=\"white\" stroke=\"white\" cx=\"468.72\" cy=\"-29.28\" rx=\"27\" ry=\"18\"/> <text text-anchor=\"middle\" x=\"468.72\" y=\"-26.48\" font-family=\"Times,serif\" font-size=\"11.00\">U</text> </g> <!-- 11&#45;&#45;U --> <g id=\"edge9\" class=\"edge\"> <title>11&#45;&#45;U</title> <path fill=\"none\" stroke=\"black\" d=\"M480.46,-92.41C477.96,-78.96 474.56,-60.67 472.06,-47.24\"/> </g> <!-- 10 --> <g id=\"10\" class=\"node\"> <title>10</title> <ellipse fill=\"white\" stroke=\"white\" cx=\"427.17\" cy=\"-176.49\" rx=\"27\" ry=\"18\"/> <text text-anchor=\"middle\" x=\"427.17\" y=\"-173.69\" font-family=\"Times,serif\" font-size=\"11.00\">10</text> </g> <!-- 11&#45;&#45;10 --> <g id=\"edge12\" class=\"edge\"> <title>11&#45;&#45;10</title> <path fill=\"none\" stroke=\"black\" d=\"M470.38,-126.08C461.49,-136.46 449.85,-150.03 440.89,-160.48\"/> </g> <!-- V --> <g id=\"V\" class=\"node\"> <title>V</title> <ellipse fill=\"white\" stroke=\"white\" cx=\"483.82\" cy=\"-231.9\" rx=\"27\" ry=\"18\"/> <text text-anchor=\"middle\" x=\"483.82\" y=\"-229.1\" font-family=\"Times,serif\" font-size=\"11.00\">V</text> </g> <!-- 10&#45;&#45;V --> <g id=\"edge11\" class=\"edge\"> <title>10&#45;&#45;V</title> <path fill=\"none\" stroke=\"black\" d=\"M442.65,-191.63C450.64,-199.45 460.37,-208.96 468.36,-216.78\"/> </g> <!-- 9 --> <g id=\"9\" class=\"node\"> <title>9</title> <ellipse fill=\"white\" stroke=\"white\" cx=\"343.53\" cy=\"-205.39\" rx=\"27\" ry=\"18\"/> <text text-anchor=\"middle\" x=\"343.53\" y=\"-202.59\" font-family=\"Times,serif\" font-size=\"11.00\">9</text> </g> <!-- 10&#45;&#45;9 --> <g id=\"edge14\" class=\"edge\"> <title>10&#45;&#45;9</title> <path fill=\"none\" stroke=\"black\" d=\"M402.98,-184.85C391.88,-188.68 378.76,-193.22 367.67,-197.05\"/> </g> <!-- F --> <g id=\"F\" class=\"node\"> <title>F</title> <ellipse fill=\"white\" stroke=\"white\" cx=\"328.85\" cy=\"-133.06\" rx=\"27\" ry=\"18\"/> <text text-anchor=\"middle\" x=\"328.85\" y=\"-130.26\" font-family=\"Times,serif\" font-size=\"11.00\">F</text> </g> <!-- 9&#45;&#45;F --> <g id=\"edge13\" class=\"edge\"> <title>9&#45;&#45;F</title> <path fill=\"none\" stroke=\"black\" d=\"M339.9,-187.51C337.64,-176.38 334.75,-162.12 332.49,-150.99\"/> </g> <!-- 8 --> <g id=\"8\" class=\"node\"> <title>8</title> <ellipse fill=\"white\" stroke=\"white\" cx=\"263.64\" cy=\"-246.87\" rx=\"27\" ry=\"18\"/> <text text-anchor=\"middle\" x=\"263.64\" y=\"-244.07\" font-family=\"Times,serif\" font-size=\"11.00\">8</text> </g> <!-- 9&#45;&#45;8 --> <g id=\"edge16\" class=\"edge\"> <title>9&#45;&#45;8</title> <path fill=\"none\" stroke=\"black\" d=\"M322.12,-216.51C310.66,-222.46 296.58,-229.77 285.11,-235.73\"/> </g> <!-- 8&#45;&#45;18 --> <g id=\"edge15\" class=\"edge\"> <title>8&#45;&#45;18</title> <path fill=\"none\" stroke=\"black\" d=\"M243.16,-234.76C231.29,-227.73 216.4,-218.92 204.54,-211.9\"/> </g> <!-- 0 --> <g id=\"0\" class=\"node\"> <title>0</title> <ellipse fill=\"white\" stroke=\"white\" cx=\"267.02\" cy=\"-335.82\" rx=\"27\" ry=\"18\"/> <text text-anchor=\"middle\" x=\"267.02\" y=\"-333.02\" font-family=\"Times,serif\" font-size=\"11.00\">0</text> </g> <!-- 8&#45;&#45;0 --> <g id=\"edge23\" class=\"edge\"> <title>8&#45;&#45;0</title> <path fill=\"none\" stroke=\"black\" d=\"M264.32,-264.87C264.9,-280.2 265.74,-302.13 266.33,-317.54\"/> </g> <!-- 5 --> <g id=\"5\" class=\"node\"> <title>5</title> <ellipse fill=\"white\" stroke=\"white\" cx=\"200.6\" cy=\"-478.87\" rx=\"27\" ry=\"18\"/> <text text-anchor=\"middle\" x=\"200.6\" y=\"-476.07\" font-family=\"Times,serif\" font-size=\"11.00\">5</text> </g> <!-- T1 --> <g id=\"T1\" class=\"node\"> <title>T1</title> <ellipse fill=\"white\" stroke=\"white\" cx=\"189.69\" cy=\"-560.03\" rx=\"27\" ry=\"18\"/> <text text-anchor=\"middle\" x=\"189.69\" y=\"-557.23\" font-family=\"Times,serif\" font-size=\"11.00\">T1</text> </g> <!-- 5&#45;&#45;T1 --> <g id=\"edge17\" class=\"edge\"> <title>5&#45;&#45;T1</title> <path fill=\"none\" stroke=\"black\" d=\"M198.18,-496.88C196.37,-510.33 193.91,-528.63 192.1,-542.07\"/> </g> <!-- T2 --> <g id=\"T2\" class=\"node\"> <title>T2</title> <ellipse fill=\"white\" stroke=\"white\" cx=\"123.69\" cy=\"-503.72\" rx=\"27\" ry=\"18\"/> <text text-anchor=\"middle\" x=\"123.69\" y=\"-500.92\" font-family=\"Times,serif\" font-size=\"11.00\">T2</text> </g> <!-- 5&#45;&#45;T2 --> <g id=\"edge18\" class=\"edge\"> <title>5&#45;&#45;T2</title> <path fill=\"none\" stroke=\"black\" d=\"M176.27,-486.73C167.29,-489.63 157.12,-492.92 148.13,-495.82\"/> </g> <!-- 1 --> <g id=\"1\" class=\"node\"> <title>1</title> <ellipse fill=\"white\" stroke=\"white\" cx=\"266.79\" cy=\"-423.45\" rx=\"27\" ry=\"18\"/> <text text-anchor=\"middle\" x=\"266.79\" y=\"-420.65\" font-family=\"Times,serif\" font-size=\"11.00\">1</text> </g> <!-- 5&#45;&#45;1 --> <g id=\"edge21\" class=\"edge\"> <title>5&#45;&#45;1</title> <path fill=\"none\" stroke=\"black\" d=\"M217.65,-464.6C227.45,-456.39 239.74,-446.1 249.57,-437.87\"/> </g> <!-- 2 --> <g id=\"2\" class=\"node\"> <title>2</title> <ellipse fill=\"white\" stroke=\"white\" cx=\"330.02\" cy=\"-482.03\" rx=\"27\" ry=\"18\"/> <text text-anchor=\"middle\" x=\"330.02\" y=\"-479.23\" font-family=\"Times,serif\" font-size=\"11.00\">2</text> </g> <!-- J --> <g id=\"J\" class=\"node\"> <title>J</title> <ellipse fill=\"white\" stroke=\"white\" cx=\"335.19\" cy=\"-563.98\" rx=\"27\" ry=\"18\"/> <text text-anchor=\"middle\" x=\"335.19\" y=\"-561.18\" font-family=\"Times,serif\" font-size=\"11.00\">J</text> </g> <!-- 2&#45;&#45;J --> <g id=\"edge19\" class=\"edge\"> <title>2&#45;&#45;J</title> <path fill=\"none\" stroke=\"black\" d=\"M331.16,-500.22C332.02,-513.8 333.19,-532.28 334.04,-545.84\"/> </g> <!-- A --> <g id=\"A\" class=\"node\"> <title>A</title> <ellipse fill=\"white\" stroke=\"white\" cx=\"404.37\" cy=\"-512.6\" rx=\"27\" ry=\"18\"/> <text text-anchor=\"middle\" x=\"404.37\" y=\"-509.8\" font-family=\"Times,serif\" font-size=\"11.00\">A</text> </g> <!-- 2&#45;&#45;A --> <g id=\"edge20\" class=\"edge\"> <title>2&#45;&#45;A</title> <path fill=\"none\" stroke=\"black\" d=\"M353.13,-491.53C362.08,-495.22 372.31,-499.42 381.26,-503.1\"/> </g> <!-- 2&#45;&#45;1 --> <g id=\"edge22\" class=\"edge\"> <title>2&#45;&#45;1</title> <path fill=\"none\" stroke=\"black\" d=\"M314.06,-467.25C304.55,-458.44 292.51,-447.28 282.96,-438.43\"/> </g> <!-- 1&#45;&#45;0 --> <g id=\"edge24\" class=\"edge\"> <title>1&#45;&#45;0</title> <path fill=\"none\" stroke=\"black\" d=\"M266.84,-405.3C266.88,-390.26 266.93,-368.99 266.97,-353.96\"/> </g> </g> </svg> "
                }
            ],
            "status": "success"
        }}
    elif jobid == '2':
        return {"jobid":2,"status":1}
    else:
        return {"jobid":jobid,"status":55,"result":"Pretend we had an error here."}


