import 'bootstrap/dist/css/bootstrap.min.css'
import { Modal } from 'bootstrap'
export const lib_bootstrap ={
    'Modal': Modal
}

export { Graphviz } from '@hpcc-js/wasm/graphviz'
export * as lib_d3graphviz from 'd3-graphviz'
export * as lib_d3 from 'd3'

export * as lib_SaveSvgAsPng from 'save-svg-as-png'
export * as lib_TabOverride from 'taboverride'
export * as lib_Sortable from 'sortablejs'
export * as lib_Feather from 'feather-icons'

export const lib_DotParser = {
    'parse': require( 'dotparser' )
}
