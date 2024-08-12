import React, { useState, useEffect } from 'react';

function MessageDisplay({ message }) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (message) {
      setVisible(true);
      const timer = setTimeout(() => {
        setVisible(false);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [message]);

  if (!visible) return null;

  return (
    <div className="message-display">
      {message}
    </div>
  );
}

export default MessageDisplay;