/** Link utilities: SPA Link interception checks and external-link behavior. External
 *  links are uniformly expressed at the call site as a bare <a target="_blank"
 *  rel="noopener noreferrer"> (precedents: Lightbox/AuthorCard), never through the Link
 *  component. */

/** Modified clicks (new tab / download etc.) are not intercepted; browser defaults apply. */
export function isModifiedClick(event: {
  metaKey: boolean;
  ctrlKey: boolean;
  shiftKey: boolean;
  altKey: boolean;
  button?: number;
}): boolean {
  return event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || (event.button ?? 0) !== 0;
}
