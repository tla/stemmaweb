## List of possible interactions in relation mapper

    c: Concatenate a sequence of readings into a single reading
    d: Detach one or more witnesses from the collation for the selected reading(s)
    e: Provide an emendation at the selected text position
    h: Show / hide this menu
    l: Set / unset the selected reading(s) as canonical / lemma 
        **Q** Effect?
    n: Propagate the normal form of the selected reading(s) along specified relations
        **Q** Effect?
    r: Relate the selected readings
    x: Expunge all relationships on the selected reading(s)
        **Q** Effect?


* CLICK a node
    * Reading info displays
    * Edit button becomes active
        * If clicked, dialog:
            * Lemmatize this reading (check box) 
                * **Q** What happens?
            * This is a nonsense word (check box) 
                * **Q** What happens?
            * This word's grammar cannot be right (check box) 
                * **Q** What happens?
            * Correct the reading - handle with care!
                * Reading base text (text field, has current reading)
                * Reading display form (text field, has current display form) 
                    **Q**: is this what comes with dot for the graph or do we need to update that?
    * Detach button becomes active
        * If clicked
            * If not allowed (server response indicates this): warning.
            * If allowed:
                * **Q** when is this allowed, and what is the result? When the node has multiple witnesses?
                * Select witnesses to detach
                * Node is split
                * **Q/D** Reading properties as list (right hand side)?

* SHIFT + mouse move, SHIFT click multiple nodes
    * **Q/D** Reading properties as list (right hand side)?
    * Detach button becomes active (preferably if allowed)
        * If clicked
            * If not allowed (**Q** server response indicates this?): warning.
            * If allowed (**Q** server response indicates this?):
                * **Q** when is this allowed, and what is the result? When all nodes share one or multipe witnesses?
                * Select witnesses to detach (only witnesses common to all nodes are in the select list)
                * Node is split
                * **Q/D** Reading properties as list (right hand side)?
    * Concatenate button becomes active (preferably IF allowed)
        * If clicked
            * If not allowed (**Q** server response indicates this?): warning.
            * If allowed (**Q** server response indicates this?)
                * Nodes are merged
                * **Q** when is this allowed, and what is the result? When all nodes share one or multipe witnesses?
                * **Q** what happens to potential conflicting reading properties? Eg. one reading is ungrammatical, does that make the reading as a whole ungrammatical?
                * Reading list updated
    * Merge button becomes active (preferably if allowed)
        * If clicked
            * If not allowed (**Q** server response indicates this?): warning.
            * If allowed (**Q** server response indicates this?)
                * **Q** when is this allowed, and what is the result? When all nodes have the same reading and rank?
    * Create relation button becomes active (prefearbly if allowed)
        * If clicked
            * show dialog
                * Relation type (options: list of defined relations)
                * Scope of relation (options: local or document) **Q** The same for all traditions? What is the effect?
                * Is this variance stemmatically significant? (options: yes, maybe, no) **Q** Does this have a (visual) effect?
                * Variants unlikely to arise coincidentally (checkbox)
                * Annotation or note (text area)

* DRAG (drop) node on top of another
    * This is the same as multiple select with two nodes but immediately activates the 