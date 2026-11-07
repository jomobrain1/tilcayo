import { FileUpload } from '@tilcayo/ui'
import '@tilcayo/styles/index.css'

export default function DocumentUploadExample() {
  return <FileUpload label="Choose a document" accept=".pdf,.docx,.xlsx,.zip" maxBytes={20 * 1024 * 1024} description="Local demo · PDF, DOCX, XLSX or ZIP · Up to 20 MB. No file leaves your browser." onUpload={async (_file, { signal, onProgress }) => {
    if (signal.aborted) throw new DOMException('Cancelled', 'AbortError')
    onProgress(50)
    await new Promise<void>(resolve => setTimeout(resolve, 500))
    if (signal.aborted) throw new DOMException('Cancelled', 'AbortError')
    onProgress(100)
  }} />
}
