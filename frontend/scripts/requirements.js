import 'bootstrap/dist/css/bootstrap.min.css'
import { Modal } from 'bootstrap'
import { Dropdown } from 'bootstrap'
export const lib_bootstrap = {
    'Modal': Modal,
    'Dropdown': Dropdown
}

export { Graphviz } from '@hpcc-js/wasm/graphviz'
export * as lib_d3graphviz from 'd3-graphviz'
export * as lib_d3 from 'd3'

export * as lib_SaveSvgAsPng from 'save-svg-as-png'
export * as lib_TabOverride from 'taboverride'
export * as lib_Sortable from 'sortablejs'
export * as lib_Feather from 'feather-icons'

import sanitize from 'sanitize-filename'
export const lib_SanitizeFilename = {
    'sanitize': sanitize
}

export const lib_DotParser = {
    'parse': require( 'dotparser' )
}
