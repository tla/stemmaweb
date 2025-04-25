const svg_slide_indicator_old = `<svg
  class="indicator-svg"
  data-active="false"
  xmlns="http://www.w3.org/2000/svg"
  width="15"
  height="12"
  viewBox="0 0 24 24"
  fill="none"
  stroke="currentColor"
  stroke-width="1"
  stroke-linecap="round"
  stroke-linejoin="round"
>
  <circle cx="12" cy="12" r="10"></circle>
</svg>`;

const svg_slide_indicator_active_old = `<svg
  class="indicator-svg"
  data-active="true"
  xmlns="http://www.w3.org/2000/svg"
  width="15"
  height="12"
  viewBox="0 0 24 24"
  fill="rgb(180,180,180)"
  stroke="currentColor"
  stroke-width="1"
  stroke-linecap="round"
  stroke-linejoin="round"
>
  <circle cx="12" cy="12" r="10"></circle>
</svg>`;

const svg_slide_indicator = `<svg 
  xmlns="http://www.w3.org/2000/svg" 
  width="15" height="15" viewBox="0 0 24 24" 
  fill="none" 
  stroke="currentColor" 
  stroke-width="2" 
  stroke-linecap="round" 
  stroke-linejoin="round" 
  class="indicator-svg">
    <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
  </svg>`;

  const svg_slide_indicator_active = `<svg 
  xmlns="http://www.w3.org/2000/svg" 
  width="15" height="15" viewBox="0 0 24 24" 
  fill="#cfdcee"
    stroke="currentColor" 
  stroke-width="2" 
  stroke-linecap="round" 
  stroke-linejoin="round" 
  class="indicator-svg">
    <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
  </svg>`;

  const job_running_indicator = `<svg
  style="vertical-align: baseline;"
  class="indicator-svg"
  data-active="true"
  xmlns="http://www.w3.org/2000/svg"
  width="15"
  height="12"
  viewBox="0 -2 24 24"
  fill="#aae18b"
  stroke="currentColor"
  stroke-width="1"
  stroke-linecap="round"
  stroke-linejoin="round"
>
  <circle cx="12" cy="12" r="10"></circle>
</svg>`;

const job_error_indicator = `<svg
  style="vertical-align: baseline;"
  class="indicator-svg"
  data-active="true"
  xmlns="http://www.w3.org/2000/svg"
  width="15"
  height="12"
  viewBox="0 -2 24 24"
  fill="#dc3545"
  stroke="currentColor"
  stroke-width="1"
  stroke-linecap="round"
  stroke-linejoin="round"
>
  <circle cx="12" cy="12" r="10"></circle>
</svg>`;

const google_icon = `
<svg xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" viewBox="0 0 24 24"><g id="feGoogle0" fill="none" fill-rule="evenodd" stroke="none" stroke-width="1"><g id="feGoogle1" fill="currentColor" fill-rule="nonzero"><path id="feGoogle2" d="M11.99 13.9v-3.72h9.36c.14.63.25 1.22.25 2.05c0 5.71-3.83 9.77-9.6 9.77c-5.52 0-10-4.48-10-10S6.48 2 12 2c2.7 0 4.96.99 6.69 2.61l-2.84 2.76c-.72-.68-1.98-1.48-3.85-1.48c-3.31 0-6.01 2.75-6.01 6.12s2.7 6.12 6.01 6.12c3.83 0 5.24-2.65 5.5-4.22h-5.51v-.01Z"/></g></g></svg>
`;

const github_icon = `
<svg xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" viewBox="0 0 16 16"><path fill="currentColor" d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59c.4.07.55-.17.55-.38c0-.19-.01-.82-.01-1.49c-2.01.37-2.53-.49-2.69-.94c-.09-.23-.48-.94-.82-1.13c-.28-.15-.68-.52-.01-.53c.63-.01 1.08.58 1.23.82c.72 1.21 1.87.87 2.33.66c.07-.52.28-.87.51-1.07c-1.78-.2-3.64-.89-3.64-3.95c0-.87.31-1.59.82-2.15c-.08-.2-.36-1.02.08-2.12c0 0 .67-.21 2.2.82c.64-.18 1.32-.27 2-.27c.68 0 1.36.09 2 .27c1.53-1.04 2.2-.82 2.2-.82c.44 1.1.16 1.92.08 2.12c.51.56.82 1.27.82 2.15c0 3.07-1.87 3.75-3.65 3.95c.29.25.54.73.54 1.48c0 1.07-.01 1.93-.01 2.2c0 .21.15.46.55.38A8.012 8.012 0 0 0 16 8c0-4.42-3.58-8-8-8z"/></svg>
`;
