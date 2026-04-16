import React, { createContext, useContext, useState, useRef, useCallback } from 'react';

const UploadContext = createContext(null);

export function useUploadContext() {
  return useContext(UploadContext);
}

export function UploadProvider({ children }) {
  const [jobs, setJobs] = useState([]); // [{ id, total, current, currentFileName, results, status: 'processing'|'done'|'error' }]
  const jobIdRef = useRef(0);

  const startJob = useCallback((total) => {
    const id = ++jobIdRef.current;
    const job = { id, total, current: 0, currentFileName: '', results: [], status: 'processing' };
    setJobs(prev => [...prev, job]);
    return id;
  }, []);

  const updateJob = useCallback((jobId, updates) => {
    setJobs(prev => prev.map(j => j.id === jobId ? { ...j, ...updates } : j));
  }, []);

  const dismissJob = useCallback((jobId) => {
    setJobs(prev => prev.filter(j => j.id !== jobId));
  }, []);

  return (
    <UploadContext.Provider value={{ jobs, startJob, updateJob, dismissJob }}>
      {children}
    </UploadContext.Provider>
  );
}