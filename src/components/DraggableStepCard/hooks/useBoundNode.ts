import { useEffect, useRef, useState } from 'react';
import { resolveSnapshot } from '../../universal-ui/views/grid-view';
import { createBindingFromSnapshotAndXPath } from '../../step-card/element-binding/helpers';

export function useBoundNode(stepId: string, parameters: any, onUpdateStepParameters?: (id: string, nextParams: any) => void) {
  const [boundNode, setBoundNode] = useState<any>(null);
  const attemptedAutoBindRef = useRef<boolean>(false);

  useEffect(() => {
    let cancelled = false;
    const p: any = parameters || {};

    const tryResolveFromBinding = (bindingAny: any) => {
      try {
        if (bindingAny && bindingAny.snapshot && bindingAny.locator?.xpath) {
          const resolved = resolveSnapshot({ elementBinding: bindingAny });
          if (!cancelled) setBoundNode(resolved.node);
          return true;
        }
      } catch (_) {}
      return false;
    };

    if (tryResolveFromBinding(p.elementBinding)) return () => { cancelled = true; };

    if (!attemptedAutoBindRef.current) {
      attemptedAutoBindRef.current = true;
      try {
        const xpath: string | undefined = p?.elementLocator?.additionalInfo?.xpath || p?.xpath;
        const snap = p?.xmlSnapshot;
        const xmlText: string | undefined = snap?.xmlContent || p?.xmlContent;
        if (xpath && typeof xpath === 'string' && xpath.trim() && typeof xmlText === 'string' && xmlText.trim()) {
          const snapshot = {
            source: 'memory' as const,
            text: xmlText,
            sha1: snap?.xmlHash,
            capturedAt: snap?.timestamp || Date.now(),
            deviceId: snap?.deviceInfo?.deviceId || p?.deviceId,
          };
          const resolved = resolveSnapshot({ xmlText: snapshot.text, xpath });
          if (!cancelled) setBoundNode(resolved.node);
          const binding = createBindingFromSnapshotAndXPath(snapshot as any, xpath);
          if (binding && onUpdateStepParameters) {
            onUpdateStepParameters(stepId, {
              ...p,
              elementBinding: binding,
            });
          }
        } else {
          if (!cancelled) setBoundNode(null);
        }
      } catch (_) {
        if (!cancelled) setBoundNode(null);
      }
    } else {
      setBoundNode(null);
    }

    return () => { cancelled = true; };
  }, [stepId, parameters?.elementBinding, parameters?.xmlSnapshot, parameters?.elementLocator?.additionalInfo?.xpath, parameters?.xpath]);

  return boundNode;
}
