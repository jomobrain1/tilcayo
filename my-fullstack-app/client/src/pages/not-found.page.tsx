import { ErrorPage } from '../components/error-page'

export function NotFoundPage() {
  return <ErrorPage code="404" title="Page not found" description="We couldn't find the page you're looking for. It may have moved, or the address might be incorrect." primary={{ to: '/', label: 'Back to home' }} secondary={{ to: '/elements', label: 'Explore elements' }} note="Check the address, or use the navigation to find your way." />
}
