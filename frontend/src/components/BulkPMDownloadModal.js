import React, { useState, useEffect, useMemo } from 'react';
import { X, Download, Loader, AlertTriangle, FileText, Calendar, FileMinus, CheckCircle } from 'lucide-react';
import apiService from '../services/apiService';
import toast from '../utils/toast';

const BulkPMDownloadModal = ({ isOpen, onClose, selectedAssets = [] }) => {
  const [assetData, setAssetData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isDownloading, setIsDownloading] = useState(false);
  const [selectedBatch, setSelectedBatch] = useState(null); // 'latest', 'blank', 1, 2, 3...

  useEffect(() => {
    if (isOpen && selectedAssets.length > 0) {
      fetchPMHistoryForAssets();
    } else if (!isOpen) {
      // Reset state on close
      setAssetData([]);
      setLoading(true);
      setError(null);
      setSelectedBatch(null);
    }
  }, [isOpen, selectedAssets]);

  const fetchPMHistoryForAssets = async () => {
    setLoading(true);
    setError(null);
    try {
      const assetIds = selectedAssets.map(a => a.Asset_ID);
      const response = await apiService.getPMHistoryForAssets(assetIds);
      
      const processedData = selectedAssets.map(asset => ({
        ...asset,
        pmRecords: response.data[asset.Asset_ID] || []
      }));

      setAssetData(processedData);
    } catch (err) {
      setError('Failed to fetch PM history. ' + err.message);
      toast.error('Failed to fetch PM history.');
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = async () => {
    if (!selectedBatch) {
      toast.error('Please select a batch to download.');
      return;
    }

    setIsDownloading(true);
    try {
      const pmIds = [];
      const blankAssetIds = [];

      assetData.forEach(asset => {
        if (selectedBatch === 'blank') {
          blankAssetIds.push(asset.Asset_ID);
        } else if (selectedBatch === 'latest') {
          if (asset.pmRecords && asset.pmRecords.length > 0) {
            const latestPM = asset.pmRecords.reduce((latest, current) => 
              new Date(current.PM_Date) > new Date(latest.PM_Date) ? current : latest
            );
            pmIds.push(latestPM.PM_ID);
          } else {
            // Fallback to blank form if the asset has no PMs yet
            blankAssetIds.push(asset.Asset_ID);
          }
        } else {
          // Specific PM sequence (1, 2, 3...)
          const targetPM = asset.pmRecords.find(pm => pm.pmSequence === selectedBatch);
          if (targetPM) {
            pmIds.push(targetPM.PM_ID);
          }
        }
      });

      if (pmIds.length === 0 && blankAssetIds.length === 0) {
        toast.error(`No PM forms found for this selection.`);
        setIsDownloading(false);
        return;
      }

      await apiService.bulkDownloadPMReports(pmIds, blankAssetIds);
      toast.success('Your download has started.');
      onClose();

    } catch (err) {
      toast.error('Download failed: ' + err.message);
    } finally {
      setIsDownloading(false);
    }
  };

  const maxPMCount = useMemo(() => {
    if (!assetData || assetData.length === 0) return 0;
    return Math.max(...assetData.map(a => Math.max(0, ...a.pmRecords.map(pm => pm.pmSequence || 0))));
  }, [assetData]);

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <div>
            <h2>Fast Bulk Download</h2>
            <p className="subtitle">Downloading forms for {assetData.length} selected assets</p>
          </div>
          <button onClick={onClose} className="close-button"><X size={24} /></button>
        </div>

        <div className="modal-body">
          {loading ? (
            <div className="loading-container"><Loader className="spinner" /> Fetching latest PM history...</div>
          ) : error ? (
            <div className="error-container"><AlertTriangle /> {error}</div>
          ) : (
            <>
              <p className="instruction-text">Select the batch of PM forms you want to generate:</p>
              
              <div className="batch-grid">
                {/* Latest PMs Card */}
                <div 
                  className={`batch-card ${selectedBatch === 'latest' ? 'selected' : ''}`}
                  onClick={() => setSelectedBatch('latest')}
                >
                  {selectedBatch === 'latest' && <CheckCircle className="check-icon" size={20} />}
                  <Calendar size={32} className="card-icon" />
                  <div className="card-details">
                    <h3>Latest PM Forms</h3>
                    <p>Downloads the most recent record for every asset. If an asset has no records, a blank form is provided.</p>
                  </div>
                </div>

                {/* Blank Forms Card */}
                <div 
                  className={`batch-card ${selectedBatch === 'blank' ? 'selected' : ''}`}
                  onClick={() => setSelectedBatch('blank')}
                >
                  {selectedBatch === 'blank' && <CheckCircle className="check-icon" size={20} />}
                  <FileMinus size={32} className="card-icon" />
                  <div className="card-details">
                    <h3>Empty Templates</h3>
                    <p>Downloads completely blank PM forms for all {assetData.length} assets.</p>
                  </div>
                </div>

                {/* Specific PM Sequence Cards */}
                {[...Array(maxPMCount)].map((_, i) => {
                  const pmNumber = i + 1;
                  const assetsWithThisPM = assetData.filter(a => a.pmRecords.some(pm => pm.pmSequence === pmNumber)).length;
                  
                  return (
                    <div 
                      key={pmNumber}
                      className={`batch-card ${selectedBatch === pmNumber ? 'selected' : ''} ${assetsWithThisPM === 0 ? 'disabled' : ''}`}
                      onClick={() => assetsWithThisPM > 0 && setSelectedBatch(pmNumber)}
                    >
                      {selectedBatch === pmNumber && <CheckCircle className="check-icon" size={20} />}
                      <FileText size={32} className="card-icon" />
                      <div className="card-details">
                        <h3>PM #{pmNumber} Forms</h3>
                        <p>{assetsWithThisPM} out of {assetData.length} assets have completed PM #{pmNumber}.</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>

        <div className="modal-footer">
          <button className="btn-secondary" onClick={onClose} disabled={isDownloading}>
            Cancel
          </button>
          <button className="btn-primary" onClick={handleDownload} disabled={loading || isDownloading || !selectedBatch}>
            {isDownloading ? <><Loader className="spinner-sm" /> Processing...</> : <><Download size={18} /> Download Batch</>}
          </button>
        </div>
      </div>

      <style jsx>{`
        .modal-overlay {
          position: fixed;
          top: 0; left: 0; right: 0; bottom: 0;
          background: rgba(0, 0, 0, 0.6);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000;
        }
        .modal-content {
          background: #f8f9fa;
          border-radius: 12px;
          width: 90%;
          max-width: 700px;
          display: flex;
          flex-direction: column;
          box-shadow: 0 10px 40px rgba(0,0,0,0.2);
        }
        .modal-header {
          padding: 24px;
          background: white;
          border-radius: 12px 12px 0 0;
          border-bottom: 1px solid #e5e7eb;
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
        }
        .modal-header h2 { margin: 0; font-size: 1.5rem; color: #2c3e50; }
        .subtitle { margin: 4px 0 0 0; color: #7f8c8d; font-size: 0.95rem; }
        .close-button { background: none; border: none; cursor: pointer; color: #95a5a6; transition: color 0.2s; }
        .close-button:hover { color: #e74c3c; }
        
        .modal-body {
          padding: 24px;
          max-height: 60vh;
          overflow-y: auto;
        }
        .instruction-text {
          margin: 0 0 16px 0;
          color: #34495e;
          font-weight: 600;
          font-size: 1.05rem;
        }
        
        .batch-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
          gap: 16px;
        }
        .batch-card {
          background: white;
          border: 2px solid #e0e0e0;
          border-radius: 8px;
          padding: 20px;
          cursor: pointer;
          display: flex;
          align-items: flex-start;
          gap: 16px;
          transition: all 0.2s;
          position: relative;
        }
        .batch-card:hover:not(.disabled) {
          border-color: #3498db;
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(52, 152, 219, 0.15);
        }
        .batch-card.selected {
          border-color: #27ae60;
          background: #f0fdf4;
          box-shadow: 0 4px 12px rgba(39, 174, 96, 0.2);
        }
        .batch-card.disabled {
          opacity: 0.5;
          cursor: not-allowed;
          background: #f5f5f5;
        }
        .card-icon {
          color: #3498db;
          flex-shrink: 0;
        }
        .batch-card.selected .card-icon { color: #27ae60; }
        .check-icon {
          position: absolute;
          top: 12px;
          right: 12px;
          color: #27ae60;
        }
        .card-details h3 {
          margin: 0 0 4px 0;
          font-size: 1.1rem;
          color: #2c3e50;
        }
        .card-details p {
          margin: 0;
          font-size: 0.85rem;
          color: #7f8c8d;
          line-height: 1.4;
        }

        .modal-footer {
          padding: 20px 24px;
          background: white;
          border-radius: 0 0 12px 12px;
          border-top: 1px solid #e5e7eb;
          display: flex;
          justify-content: flex-end;
          gap: 12px;
        }
        .btn-secondary, .btn-primary {
          padding: 12px 24px;
          border-radius: 6px;
          font-weight: 600;
          font-size: 1rem;
          cursor: pointer;
          display: flex;
          align-items: center;
          gap: 8px;
          border: none;
          transition: all 0.2s;
        }
        .btn-secondary {
          background: #f1f2f6;
          color: #2c3e50;
        }
        .btn-secondary:hover { background: #e2e6ea; }
        .btn-primary {
          background: #27ae60;
          color: white;
        }
        .btn-primary:hover:not(:disabled) { background: #219a52; transform: translateY(-1px); }
        .btn-primary:disabled { background: #95a5a6; cursor: not-allowed; }
        
        .loading-container, .error-container { text-align: center; padding: 40px; color: #6b7280; font-size: 1.1rem; }
        .error-container { color: #e74c3c; }
        .spinner { animation: spin 1s linear infinite; margin-right: 8px; vertical-align: middle; }
        .spinner-sm { width: 18px; height: 18px; animation: spin 1s linear infinite; }
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
};

export default BulkPMDownloadModal;