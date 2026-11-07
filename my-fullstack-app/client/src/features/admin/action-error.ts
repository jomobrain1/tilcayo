export function actionError(error: unknown) {
  return error && typeof error === 'object' && 'message' in error && typeof error.message === 'string' ? error.message : 'Unable to complete this action. Please try again.';
}
