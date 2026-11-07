import Example36 from './examples/file-upload'
import source36 from './examples/file-upload.tsx?raw'
import Example37 from './examples/document-upload'
import source37 from './examples/document-upload.tsx?raw'
import type { ElementExample } from './example-card'
import Example0 from './examples/button-variants'
import source0 from './examples/button-variants.tsx?raw'
import Example1 from './examples/icon-button'
import source1 from './examples/icon-button.tsx?raw'
import Example2 from './examples/disabled-button'
import source2 from './examples/disabled-button.tsx?raw'
import Example3 from './examples/loading-button'
import source3 from './examples/loading-button.tsx?raw'
import Example4 from './examples/text-input'
import source4 from './examples/text-input.tsx?raw'
import Example5 from './examples/email-input'
import source5 from './examples/email-input.tsx?raw'
import Example6 from './examples/password-input'
import source6 from './examples/password-input.tsx?raw'
import Example7 from './examples/search-input'
import source7 from './examples/search-input.tsx?raw'
import Example8 from './examples/textarea'
import source8 from './examples/textarea.tsx?raw'
import Example9 from './examples/select'
import source9 from './examples/select.tsx?raw'
import Example10 from './examples/checkbox'
import source10 from './examples/checkbox.tsx?raw'
import Example11 from './examples/radio-group'
import source11 from './examples/radio-group.tsx?raw'
import Example12 from './examples/switch'
import source12 from './examples/switch.tsx?raw'
import Example13 from './examples/contact-form'
import source13 from './examples/contact-form.tsx?raw'
import Example14 from './examples/login-form'
import source14 from './examples/login-form.tsx?raw'
import Example15 from './examples/profile-form'
import source15 from './examples/profile-form.tsx?raw'
import Example16 from './examples/validation-form'
import source16 from './examples/validation-form.tsx?raw'
import Example17 from './examples/alerts'
import source17 from './examples/alerts.tsx?raw'
import Example18 from './examples/toast'
import source18 from './examples/toast.tsx?raw'
import Example19 from './examples/badges'
import source19 from './examples/badges.tsx?raw'
import Example20 from './examples/spinner'
import source20 from './examples/spinner.tsx?raw'
import Example21 from './examples/empty-state'
import source21 from './examples/empty-state.tsx?raw'
import Example22 from './examples/basic-card'
import source22 from './examples/basic-card.tsx?raw'
import Example23 from './examples/image-card'
import source23 from './examples/image-card.tsx?raw'
import Example24 from './examples/statistics-card'
import source24 from './examples/statistics-card.tsx?raw'
import Example25 from './examples/divider'
import source25 from './examples/divider.tsx?raw'
import Example26 from './examples/tabs'
import source26 from './examples/tabs.tsx?raw'
import Example27 from './examples/breadcrumbs'
import source27 from './examples/breadcrumbs.tsx?raw'
import Example28 from './examples/dropdown'
import source28 from './examples/dropdown.tsx?raw'
import Example29 from './examples/pagination'
import source29 from './examples/pagination.tsx?raw'
import Example30 from './examples/modal'
import source30 from './examples/modal.tsx?raw'
import Example31 from './examples/confirmation'
import source31 from './examples/confirmation.tsx?raw'
import Example32 from './examples/basic-table'
import source32 from './examples/basic-table.tsx?raw'
import Example33 from './examples/status-table'
import source33 from './examples/status-table.tsx?raw'
import Example34 from './examples/searchable-list'
import source34 from './examples/searchable-list.tsx?raw'
import Example35 from './examples/row-actions'
import source35 from './examples/row-actions.tsx?raw'

export const elementSections = [{"id": "actions", "title": "Buttons & actions", "label": "Actions"}, {"id": "inputs", "title": "Form inputs", "label": "Inputs"}, { id: "uploads", title: "File uploads", label: "Uploads" }, {"id": "choices", "title": "Choices & toggles", "label": "Choices"}, {"id": "forms", "title": "Complete forms", "label": "Forms"}, {"id": "feedback", "title": "Feedback & status", "label": "Feedback"}, {"id": "cards", "title": "Cards & layout", "label": "Cards"}, {"id": "navigation", "title": "Navigation", "label": "Navigation"}, {"id": "overlays", "title": "Overlays", "label": "Overlays"}, {"id": "data", "title": "Tables & lists", "label": "Tables"}]
export const elementExamples: ElementExample[] = [
  { id: 'file-upload', title: 'Image upload', description: 'Drag and drop, preview, progress, cancel and retry. Local demonstration.', section: 'uploads', wide: false, Preview: Example36, source: source36 },
  { id: 'document-upload', title: 'Document picker', description: 'File type and size validation for documents. Local demonstration.', section: 'uploads', wide: false, Preview: Example37, source: source37 },
  { "id": "button-variants", "title": "Button variants", "description": "Primary, outline, and ghost actions.", "section": "actions", "wide": false, Preview: Example0, source: source0 },
  { "id": "icon-button", "title": "Icon button", "description": "A compact action with an accessible label.", "section": "actions", "wide": false, Preview: Example1, source: source1 },
  { "id": "disabled-button", "title": "Disabled buttons", "description": "Make unavailable actions clear.", "section": "actions", "wide": false, Preview: Example2, source: source2 },
  { "id": "loading-button", "title": "Loading button", "description": "Prevent repeat clicks while work is pending.", "section": "actions", "wide": false, Preview: Example3, source: source3 },
  { "id": "text-input", "title": "Text input", "description": "A labeled field with a character limit.", "section": "inputs", "wide": false, Preview: Example4, source: source4 },
  { "id": "email-input", "title": "Email input", "description": "Email entry with inline format feedback.", "section": "inputs", "wide": false, Preview: Example5, source: source5 },
  { "id": "password-input", "title": "Password input", "description": "Show or hide the password as you type.", "section": "inputs", "wide": false, Preview: Example6, source: source6 },
  { "id": "search-input", "title": "Search input", "description": "Filter project names as you type.", "section": "inputs", "wide": false, Preview: Example7, source: source7 },
  { "id": "textarea", "title": "Textarea", "description": "Collect longer text with a character counter.", "section": "inputs", "wide": false, Preview: Example8, source: source8 },
  { "id": "select", "title": "Select", "description": "Choose a value from a native dropdown.", "section": "inputs", "wide": false, Preview: Example9, source: source9 },
  { "id": "checkbox", "title": "Checkbox", "description": "Opt in to a single preference.", "section": "choices", "wide": false, Preview: Example10, source: source10 },
  { "id": "radio-group", "title": "Radio group", "description": "Choose one option with native keyboard support.", "section": "choices", "wide": false, Preview: Example11, source: source11 },
  { "id": "switch", "title": "Switch", "description": "Turn a setting on or off.", "section": "choices", "wide": false, Preview: Example12, source: source12 },
  { "id": "contact-form", "title": "Contact form", "description": "A responsive form with native validation; submits locally.", "section": "forms", "wide": true, Preview: Example13, source: source13 },
  { "id": "login-form", "title": "Login form", "description": "A sign-in form pattern; it does not authenticate.", "section": "forms", "wide": true, Preview: Example14, source: source14 },
  { "id": "profile-form", "title": "Profile form", "description": "Edit example details and save them locally.", "section": "forms", "wide": true, Preview: Example15, source: source15 },
  { "id": "validation-form", "title": "Form validation", "description": "Show field errors and a successful validation state.", "section": "forms", "wide": true, Preview: Example16, source: source16 },
  { "id": "alerts", "title": "Alerts", "description": "Informational, success, warning, and error messages.", "section": "feedback", "wide": false, Preview: Example17, source: source17 },
  { "id": "toast", "title": "Toast notifications", "description": "Dismissible messages with automatic timeout.", "section": "feedback", "wide": false, Preview: Example18, source: source18 },
  { "id": "badges", "title": "Status badges", "description": "Small labels for states and categories.", "section": "feedback", "wide": false, Preview: Example19, source: source19 },
  { "id": "spinner", "title": "Loading indicator", "description": "Communicate progress and completion.", "section": "feedback", "wide": false, Preview: Example20, source: source20 },
  { "id": "empty-state", "title": "Empty state", "description": "Explain an empty view and offer a next step.", "section": "feedback", "wide": false, Preview: Example21, source: source21 },
  { "id": "basic-card", "title": "Basic card", "description": "Related content and an action in one container.", "section": "cards", "wide": false, Preview: Example22, source: source22 },
  { "id": "image-card", "title": "Image card", "description": "A self-contained image and content card.", "section": "cards", "wide": false, Preview: Example23, source: source23 },
  { "id": "statistics-card", "title": "Statistics card", "description": "A metric with supporting context.", "section": "cards", "wide": false, Preview: Example24, source: source24 },
  { "id": "divider", "title": "Divider", "description": "Separate related groups without adding visual noise.", "section": "cards", "wide": false, Preview: Example25, source: source25 },
  { "id": "tabs", "title": "Tabs", "description": "Switch panels with arrow keys, Home, and End.", "section": "navigation", "wide": false, Preview: Example26, source: source26 },
  { "id": "breadcrumbs", "title": "Breadcrumbs", "description": "Show the current location and its parent pages.", "section": "navigation", "wide": false, Preview: Example27, source: source27 },
  { "id": "dropdown", "title": "Dropdown menu", "description": "Keyboard-accessible actions with outside-click dismissal.", "section": "navigation", "wide": false, Preview: Example28, source: source28 },
  { "id": "pagination", "title": "Pagination", "description": "Move through a small set of example projects.", "section": "navigation", "wide": false, Preview: Example29, source: source29 },
  { "id": "modal", "title": "Modal dialog", "description": "A focused form with native focus containment.", "section": "overlays", "wide": false, Preview: Example30, source: source30 },
  { "id": "confirmation", "title": "Confirmation dialog", "description": "Confirm an action before changing the local example.", "section": "overlays", "wide": false, Preview: Example31, source: source31 },
  { "id": "basic-table", "title": "Basic table", "description": "Clear headings and a descriptive caption.", "section": "data", "wide": true, Preview: Example32, source: source32 },
  { "id": "status-table", "title": "Status table", "description": "Combine structured data and colored status labels.", "section": "data", "wide": true, Preview: Example33, source: source33 },
  { "id": "searchable-list", "title": "Searchable list", "description": "Filter a list and handle an empty result.", "section": "data", "wide": false, Preview: Example34, source: source34 },
  { "id": "row-actions", "title": "Editable table rows", "description": "Rename and remove local rows with confirmation.", "section": "data", "wide": true, Preview: Example35, source: source35 },
]
