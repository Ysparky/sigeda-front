import { useEffect, useState } from "react";
import { createPortal } from "react-dom";

interface PortalProps {
  children: React.ReactNode;
}

export function Portal({ children }: PortalProps) {
  const [portalRoot, setPortalRoot] = useState<HTMLElement | null>(null);

  useEffect(() => {
    // Check if portal-root exists, if not create it
    let element = document.getElementById("portal-root");
    const createdElement = !element;

    if (createdElement) {
      element = document.createElement("div");
      element.id = "portal-root";
      document.body.appendChild(element);
    }

    setPortalRoot(element);

    // Cleanup function
    return () => {
      if (createdElement && element?.parentNode) {
        element.parentNode.removeChild(element);
      }
    };
  }, []);

  // Don't render until we have a portal root
  if (!portalRoot) return null;

  return createPortal(children, portalRoot);
}
