import { FileUpload } from '@tilcayo/ui'
import '@tilcayo/styles/index.css'

export default function FileUploadExample() {
  return <FileUpload label="Upload an image" description="Local demo · JPG, PNG or WebP · Up to 2 MB. No file leaves your browser." onUpload={async (_file, { signal, onProgress }) => {
    for (let percent = 0; percent <= 100; percent += 20) {
      if (signal.aborted) throw new DOMException('Cancelled', 'AbortError')
      await new Promise<void>(resolve => setTimeout(resolve, 150))
      onProgress(percent)
    }
  }} />
}
