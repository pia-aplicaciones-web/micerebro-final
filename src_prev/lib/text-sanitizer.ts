
'use client';

/**
 * Converts a string of HTML into plain text.
 * @param html The HTML string to convert.
 * @returns The plain text representation of the HTML.
 */
export function sanitizeText(html: string): string {
    if (typeof window === 'undefined') {
        return '';
    }
    const tempDiv = document.createElement("div");
    tempDiv.innerHTML = html;

    // Replace <br> with newlines for proper line breaks
    tempDiv.querySelectorAll('br').forEach(br => br.parentNode?.replaceChild(document.createTextNode('\n'), br));
    
    // Ensure block elements also create newlines
    tempDiv.querySelectorAll('div, p').forEach(block => {
        if (block.nextSibling) {
            block.parentNode?.insertBefore(document.createTextNode('\n'), block.nextSibling);
        } else {
            block.parentNode?.appendChild(document.createTextNode('\n'));
        }
    });

    return tempDiv.textContent || tempDiv.innerText || "";
}
