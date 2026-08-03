import { useEffect } from 'react';

export function useSEO(title: string, description?: string) {
  useEffect(() => {
    document.title = `${title} | كورة نيوز`;
    if (description) {
      let metaDesc = document.querySelector('meta[name="description"]');
      if (metaDesc) {
        metaDesc.setAttribute('content', description);
      } else {
        metaDesc = document.createElement('meta');
        metaDesc.setAttribute('name', 'description');
        metaDesc.setAttribute('content', description);
        document.head.appendChild(metaDesc);
      }
    }
  }, [title, description]);
}
