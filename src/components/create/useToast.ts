import { useCallback, useEffect, useRef, useState } from 'react';

/** Toast 状态钩子：show(message) 后 3s 自动消失 */
export function useToast(): { message: string | null; show: (msg: string) => void } {
  const [message, setMessage] = useState<string | null>(null);
  const timerRef = useRef(0);

  useEffect(() => () => window.clearTimeout(timerRef.current), []);

  const show = useCallback((msg: string) => {
    window.clearTimeout(timerRef.current);
    setMessage(msg);
    timerRef.current = window.setTimeout(() => setMessage(null), 3000);
  }, []);

  return { message, show };
}
