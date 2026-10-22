import { useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';

export function RouteAccessibility() {
  const { pathname } = useLocation();
  const previousPath = useRef(pathname);
  useEffect(() => {
    const main = document.getElementById('conteudo');
    if (!main) return;
    if (previousPath.current !== pathname) {
      main.focus();
      previousPath.current = pathname;
    }
    function updateTitle() {
      const heading = [...main!.querySelectorAll('h1')].find(
        (element) => !element.closest('[hidden], [aria-hidden="true"], [style*="display: none"]'),
      );
      const title = heading?.textContent?.trim();
      document.title = title ? `${title} | Clash Cup Brasil` : 'Clash Cup Brasil';
    }
    updateTitle();
    const observer = new MutationObserver(updateTitle);
    observer.observe(main, {
      childList: true,
      subtree: true,
      characterData: true,
      attributes: true,
      attributeFilter: ['hidden', 'aria-hidden', 'style'],
    });
    return () => observer.disconnect();
  }, [pathname]);
  return null;
}
