import React, { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';

function MainPage() {
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const queryParams = new URLSearchParams(location.search);
    const sessionId = queryParams.get('sessionId');
    
    if (sessionId) {
      // 초대 링크로 접속한 경우 setup 페이지로 리다이렉트
      navigate(`/setup?sessionId=${sessionId}`);
    }
  }, [location, navigate]);

  const handleStart = () => {
    navigate('/setup');
  };

  return (
    <div>
      <h1>Emojinious</h1>
      <button onClick={handleStart}>Start</button>
    </div>
  );
}

export default MainPage;