// Create captcha script tag dynamically with the site key
injectCaptchaScript();

// Configure `d3-graphviz` to use the local Web Assembly module `/wasm/graphvizlib.wasm`
window['@hpcc-js/wasm'].wasmFolder('./wasm');

// Prepare the dashboard
initStemmaweb();
