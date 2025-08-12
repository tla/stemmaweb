- [ ] make relation graph respons to resize window
- [ ] repair click in densitychart
- [ ] repair pan in densitychart



## Mock Stexaminer

### Dot for stemma
graph "Stemweb stemma duplicate" {
        node [shape=ellipse color=black style=filled fillcolor="#feebae"];

T1 [ class=extant ] 
T2 [ class=extant ] 
A [ class=extant ] [fillcolor="#dcfcf5"]
J [ class=extant ] [fillcolor="#b1c7e7"]
C [ class=extant ] [fillcolor="#b1c7e7"]
U [ class=extant ] 
S [ class=extant ] [fillcolor="#b1c7e7"]
M [ class=extant ] [fillcolor="#b1c7e7"]
F [ class=extant ] 
V [ class=extant ] 
B [ class=extant ] 
L [ class=extant ] 
D [ class=extant ]  [fillcolor="#b1c7e7"]
omega [ class=extant ] [color="#aaaaaa" fillcolor="#f0f0f0" fontcolor="#aaaaaa"]

T1--T2
T2--A
A--J
A--C
A--U
C--S
C--M
C--F
U--F

S--D

U--omega
omega--B
B--L


U--V

}

### HTML to replace inside of `#stemma-editor-container`

(Add the following as a rule to the CSS ruleset, with the plus sign in the webtools right hand side.)

#mockstexaminer td {
  border: 2px solid white;
  padding: 4px 8px 4px 8px;
  align-content: center;
}


(Replace inner HTML of `#stemma-editor-container` with this.)

<h6 class="sidebar-heading d-flex justify-content-between align-items-center px-0 mt-3 text-muted">
    <span>Analysis Options</span>
</h6>

<table id="mockstexaminer">
<tbody>
<tr>
    <td style="width:30px;background-color:#a5f5aa;">7</td>
    <td style="width:125px;background-color:#a5f5aa;">Je n'ai</td>
    <td style="width:125px;background-color:#a5f5aa;">Jai</td>
    <td style="width:80px;background-color:#a5f5aa;">&nbsp;</td>
    <td style="width:80px;background-color:#a5f5aa;">&nbsp;</td>
</tr>
<tr>
    <td style="background-color:#fff;">11</td>
    <td style="background-color:#f0776f;">(omitted)</td>
    <td style="background-color:#f0776f;">...</td>
    <td style="background-color:#fff;">..</td>
    <td style="background-color:#fff;">.</td>
</tr>
<tr>
    <td style="background-color:#fff;">15</td>
    <td style="background-color:#fff;">des</td>
    <td style="background-color:#f0776f;">de</td>
    <td style="background-color:#fff;">&nbsp;</td>
    <td style="background-color:#fff;">&nbsp;</td>
</tr>
<tr>
    <td style="background-color:#a5f5aa;">17</td>
    <td style="background-color:#a5f5aa;">rationaliste</td>
    <td style="background-color:#a5f5aa;">rationnaliste</td>
    <td style="background-color:#a5f5aa;">&nbsp;</td>
    <td style="background-color:#fff;">&nbsp;</td>
</tr>
<tr>
    <td style="background-color:#c9dcf0;font-style:italic;">19</td>
    <td style="background-color:#fdde48;">
        <div style="display:flex;">
            <div style="flex:2 1">celle</div>
            <div style="width:20px;background-color:#feebae;"></div>
        </div>
    </td>
    <td style="background-color:#f0776f;">
        <div style="display:flex;">
            <div style="flex:2 1">celui</div>
            <div style="width:20px;background-color:#b1c7e7;"></div>
        </div>
    </td>
    <td style="background-color:#c9dcf0;">
        <div style="display:flex;">
            <div style="flex:2 1">cle</div>
            <div style="width:20px;background-color:#dcfcf5;"></div>
        </div>
    </td>
    <td style="background-color:#c9dcf0;">&nbsp;</td>
</tr>
<tr>
    <td style="background-color:#a5f5aa;">21</td>
    <td style="background-color:#a5f5aa;">croit</td>
    <td style="background-color:#a5f5aa;">croient</td>
    <td style="background-color:#a5f5aa;">crois</td>
    <td style="background-color:#a5f5aa;">&nbsp;</td>
</tr>
<tr>
    <td style="background-color:#a5f5aa;">22</td>
    <td style="background-color:#a5f5aa;">(omitted)</td>
    <td style="background-color:#a5f5aa;">en</td>
    <td style="background-color:#a5f5aa;">&nbsp;</td>
    <td style="background-color:#fff;">&nbsp;</td>
</tr>
<tr>
    <td style="background-color:#fff;">24</td>
    <td style="background-color:#fff;">m'inspirent</td>
    <td style="background-color:#f0776f;">minspire</td>
    <td style="background-color:#a5f5aa;">&nbsp;</td>
    <td style="background-color:#a5f5aa;">&nbsp;</td>
</tr>
</tbody>
</table>

<h6 class="sidebar-heading d-flex justify-content-between align-items-center px-0 mt-5 text-muted" style="margin-top:18px;">
    <span>Statistics for readings at 19</span>
</h6>

<table>
</tbody>
<tr>
<td style="border-bottom: 1px solid #dee2e6;padding-bottom:6px;">
    <b>celle</b> - copied <span style="color:#53ce5a;">6</span> time(s), changed <span style="color:#f0776f;">1</span> time(s)
    <br/>
    reading root(s) at <span style="color:#336bbb;">T1</span>
</td>
</tr>
<tr>
<td style="border-bottom: 1px solid #dee2e6;padding-top:4px;">
    <b>celui</b> - copied <span style="color:#53ce5a;">3</span> time(s), changed <span style="color:#f0776f;">0</span> time(s)
    <br/>
    reading root(s) at <span style="color:#336bbb;">C, J</span>
    <br/>
    reading parent(s):
    <br/>
    <ul style="margin-bottom:6px;">
        <li>r97.3 (cle) = no syntactic relation</li>
    </ul>
</td>
</tr>
<tr>
<td style="border-bottom: 1px solid #dee2e6;padding-top:4px;">
    <b>celui</b> - copied <span style="color:#53ce5a;">0</span> time(s), changed <span style="color:#f0776f;">3</span> time(s)
    <br/>
    reading root(s) at <span style="color:#336bbb;">A</span>
    <br/>
    reading parent(s):
    <br/>
    <ul style="margin-bottom:6px;">
        <li>r97.2 (celle) = no syntactic relation</li>
    </ul>
</td>
</tr>
</tbody>
</table>

--