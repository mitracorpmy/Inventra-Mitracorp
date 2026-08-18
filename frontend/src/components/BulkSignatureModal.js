import React, { useRef, useEffect, useState } from 'react';
import { X, Trash2, PenTool, CheckSquare, Square, Users, AlertTriangle } from 'lucide-react';
import apiService from '../services/apiService';
import toast from '../utils/toast';

const BulkSignatureModal = ({ isOpen, onClose, selectedAssets = [], onSuccess }) => {
  const canvasRef = useRef(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasSignature, setHasSignature] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  
  const [pendingPms, setPendingPms] = useState([]);
  const [selectedPmIds, setSelectedPmIds] = useState([]);

  // "Signed on Behalf" toggle and fields
  const [onBehalf, setOnBehalf] = useState(false);
  const [onBehalfName, setOnBehalfName] = useState('');
  const [onBehalfDepartment, setOnBehalfDepartment] = useState('');

  // Extract pending PMs when modal opens
  useEffect(() => {
    if (isOpen) {
      const pending = [];
      
      selectedAssets.forEach(item => {
        // Option A: Handle grouped data (if it has allPMRecords)
        if (item.allPMRecords && Array.isArray(item.allPMRecords)) {
          item.allPMRecords.forEach(pm => {
            const status = pm.PM_Status || pm.Status;
            if (status === 'In-Process') {
              if (!pending.find(p => p.pmId === pm.PM_ID)) {
                pending.push({
                  pmId: pm.PM_ID,
                  date: pm.PM_Date,
                  tagId: item.Asset_Tag_ID,
                  itemName: item.Item_Name,
                  recipient: item.Recipient_Name || 'N/A'
                });
              }
            }
          });
        } 
        // Option B: Handle flat data (what we are currently passing)
        else if (item.PM_ID) {
          const status = item.PM_Status || item.Status;
          if (status === 'In-Process') {
            // Prevent duplicates
            if (!pending.find(p => p.pmId === item.PM_ID)) {
              pending.push({
                pmId: item.PM_ID,
                date: item.PM_Date,
                tagId: item.Asset_Tag_ID,
                itemName: item.Item_Name,
                recipient: item.Recipient_Name || 'N/A'
              });
            }
          }
        }
      });
      
      setPendingPms(pending);
      // Select all by default for convenience
      setSelectedPmIds(pending.map(p => p.pmId));
      
      // Reset forms
      clearSignature();
      setOnBehalf(false);
      setOnBehalfName('');
      setOnBehalfDepartment('');
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, selectedAssets]);
  
  // Setup Canvas
  useEffect(() => {
    if (isOpen && canvasRef.current && pendingPms.length > 0) {
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      
      canvas.width = 600;
      canvas.height = 250;
      
      ctx.fillStyle = 'white';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      
      ctx.strokeStyle = '#000000';
      ctx.lineWidth = 2;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
    }
  }, [isOpen, pendingPms.length]);

  const startDrawing = (e) => {
    e.preventDefault();
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    const x = (clientX - rect.left) * scaleX;
    const y = (clientY - rect.top) * scaleY;

    ctx.beginPath();
    ctx.moveTo(x, y);
    setIsDrawing(true);
    setHasSignature(true);
  };

  const draw = (e) => {
    if (!isDrawing) return;
    e.preventDefault();
    
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    const x = (clientX - rect.left) * scaleX;
    const y = (clientY - rect.top) * scaleY;

    ctx.lineTo(x, y);
    ctx.stroke();
  };

  const stopDrawing = () => {
    setIsDrawing(false);
  };

  const clearSignature = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = 'white';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    setHasSignature(false);
  };

  const togglePmSelection = (pmId) => {
    setSelectedPmIds(prev => 
      prev.includes(pmId) ? prev.filter(id => id !== pmId) : [...prev, pmId]
    );
  };

  const handleConfirm = async () => {
    if (selectedPmIds.length === 0) {
      toast.error('Please select at least one PM record to sign.');
      return;
    }

    if (!hasSignature) {
      toast.error('Please draw your signature first.');
      return;
    }

    if (onBehalf) {
      if (!onBehalfName.trim() || !onBehalfDepartment.trim()) {
        toast.error('Please fill in Name and Department for Signed on Behalf.');
        return;
      }
    }

    const canvas = canvasRef.current;
    const signatureBase64 = canvas.toDataURL('image/png');
    // Format bagiPihak exactly how the backend parses it (Name \ Department)
    const bagiPihakString = onBehalf ? `${onBehalfName.trim()} \\ ${onBehalfDepartment.trim()}` : '';
    
    setSubmitting(true);
    try {
      await apiService.bulkUploadSignature(selectedPmIds, signatureBase64, bagiPihakString);
      toast.success(`Successfully signed ${selectedPmIds.length} PM records!`);
      if (onSuccess) onSuccess();
      onClose();
    } catch (error) {
      console.error('Error submitting bulk signature:', error);
      toast.error(error.message || 'Failed to save signatures. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div style={{
      position: 'fixed',
      top: 0, left: 0, right: 0, bottom: 0,
      background: 'rgba(0, 0, 0, 0.6)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 2000,
      animation: 'fadeIn 0.3s ease'
    }}>
      <div style={{
        background: 'white',
        borderRadius: '16px',
        padding: '30px',
        maxWidth: '800px',
        width: '90%',
        maxHeight: '90vh',
        overflowY: 'auto',
        boxShadow: '0 20px 60px rgba(0, 0, 0, 0.4)',
        animation: 'slideUp 0.3s ease'
      }}>
        {/* Header */}
        <div style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center',
          marginBottom: '20px',
          paddingBottom: '15px',
          borderBottom: '2px solid #27ae60'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <PenTool size={28} color="#27ae60" />
            <div>
              <h2 style={{ margin: 0, color: '#2c3e50', fontSize: '1.5rem', fontWeight: '600' }}>
                Bulk User Signature
              </h2>
              <p style={{ margin: '5px 0 0 0', color: '#7f8c8d', fontSize: '0.9rem' }}>
                Sign multiple PM records at once
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={submitting}
            style={{
              background: 'transparent',
              border: 'none',
              cursor: submitting ? 'not-allowed' : 'pointer',
              color: '#95a5a6',
              padding: '8px',
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'all 0.2s',
              opacity: submitting ? 0.5 : 1
            }}
            onMouseOver={(e) => !submitting && (e.currentTarget.style.background = '#ecf0f1')}
            onMouseOut={(e) => (e.currentTarget.style.background = 'transparent')}
          >
            <X size={24} />
          </button>
        </div>

        {pendingPms.length === 0 ? (
          <div style={{ padding: '40px', textAlign: 'center', color: '#7f8c8d' }}>
            <AlertTriangle size={48} color="#bdc3c7" style={{ marginBottom: '10px' }} />
            <h3 style={{ margin: '0 0 10px 0', color: '#2c3e50' }}>No Pending Signatures</h3>
            <p style={{ margin: 0 }}>All PM records in this view are either already completed or not yet created.</p>
          </div>
        ) : (
          <>
            {/* PM Selection List */}
            <div style={{ marginBottom: '20px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                <strong style={{ color: '#2c3e50' }}>Select Records to Sign ({selectedPmIds.length}/{pendingPms.length})</strong>
                <button
                  onClick={() => setSelectedPmIds(selectedPmIds.length === pendingPms.length ? [] : pendingPms.map(p => p.pmId))}
                  style={{ background: 'none', border: 'none', color: '#3498db', cursor: 'pointer', fontWeight: '600', fontSize: '0.9rem' }}
                >
                  {selectedPmIds.length === pendingPms.length ? 'Deselect All' : 'Select All'}
                </button>
              </div>
              <div style={{
                maxHeight: '150px',
                overflowY: 'auto',
                border: '1px solid #e0e0e0',
                borderRadius: '8px',
                background: '#f8f9fa'
              }}>
                {pendingPms.map(pm => {
                  const isSelected = selectedPmIds.includes(pm.pmId);
                  return (
                    <div
                      key={pm.pmId}
                      onClick={() => togglePmSelection(pm.pmId)}
                      style={{
                        padding: '10px 15px',
                        borderBottom: '1px solid #e0e0e0',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '12px',
                        cursor: 'pointer',
                        background: isSelected ? '#e8f5e9' : 'white',
                        transition: 'background 0.2s'
                      }}
                    >
                      <div style={{ color: isSelected ? '#27ae60' : '#bdc3c7' }}>
                        {isSelected ? <CheckSquare size={18} /> : <Square size={18} />}
                      </div>
                      <div style={{ flex: 1, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div>
                          <div style={{ fontWeight: '600', color: '#2c3e50', fontSize: '0.9rem' }}>{pm.tagId}</div>
                          <div style={{ fontSize: '0.8rem', color: '#7f8c8d' }}>{pm.itemName}</div>
                        </div>
                        <div style={{ fontSize: '0.85rem', color: '#34495e', background: '#ecf0f1', padding: '4px 8px', borderRadius: '4px' }}>
                          <Users size={12} style={{ display: 'inline', marginRight: '4px' }} />
                          {pm.recipient}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Signed on Behalf Toggle */}
            <div style={{
              border: '1px solid #e9ecef',
              borderRadius: '10px',
              padding: '14px 16px',
              marginBottom: '16px',
              background: '#ffffff'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px' }}>
                <div>
                  <div style={{ fontWeight: 700, color: '#2c3e50' }}>Signed on Behalf</div>
                  <div style={{ fontSize: '0.85rem', color: '#7f8c8d' }}>Turn ON if signing for the recipient</div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setOnBehalf(!onBehalf);
                    if (onBehalf) { setOnBehalfName(''); setOnBehalfDepartment(''); }
                  }}
                  style={{ background: 'transparent', border: 'none', padding: 0, cursor: 'pointer' }}
                >
                  <div style={{
                    width: '64px', height: '32px', borderRadius: '16px',
                    background: onBehalf ? '#27ae60' : '#c7cdd1',
                    position: 'relative', transition: 'background 0.2s'
                  }}>
                    <div style={{
                      width: '28px', height: '28px', borderRadius: '50%',
                      background: '#ffffff', position: 'absolute',
                      top: '2px', left: onBehalf ? '34px' : '2px',
                      boxShadow: '0 2px 6px rgba(0,0,0,0.25)', transition: 'left 0.2s'
                    }} />
                  </div>
                </button>
              </div>

              {onBehalf && (
                <div style={{ marginTop: '14px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.85rem', color: '#7f8c8d', marginBottom: '6px' }}>Name:</label>
                    <input
                      type="text"
                      value={onBehalfName}
                      onChange={(e) => setOnBehalfName(e.target.value)}
                      placeholder="Enter name"
                      style={{ width: '100%', padding: '10px', border: '1px solid #e9ecef', borderRadius: '6px' }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.85rem', color: '#7f8c8d', marginBottom: '6px' }}>Department:</label>
                    <input
                      type="text"
                      value={onBehalfDepartment}
                      onChange={(e) => setOnBehalfDepartment(e.target.value)}
                      placeholder="Enter department"
                      style={{ width: '100%', padding: '10px', border: '1px solid #e9ecef', borderRadius: '6px' }}
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Canvas Container */}
            <div style={{
              border: '2px dashed #bdc3c7',
              borderRadius: '12px',
              padding: '10px',
              marginBottom: '20px',
              background: '#f8f9fa',
              position: 'relative'
            }}>
              <canvas
                ref={canvasRef}
                onMouseDown={startDrawing}
                onMouseMove={draw}
                onMouseUp={stopDrawing}
                onMouseLeave={stopDrawing}
                onTouchStart={startDrawing}
                onTouchMove={draw}
                onTouchEnd={stopDrawing}
                style={{
                  width: '100%',
                  height: 'auto',
                  cursor: 'crosshair',
                  borderRadius: '8px',
                  background: 'white',
                  display: 'block',
                  touchAction: 'none'
                }}
              />
              
              <button
                onClick={clearSignature}
                disabled={!hasSignature || submitting}
                style={{
                  position: 'absolute', top: '20px', right: '20px', padding: '8px 16px',
                  background: hasSignature && !submitting ? '#e74c3c' : '#bdc3c7',
                  color: 'white', border: 'none', borderRadius: '6px',
                  cursor: hasSignature && !submitting ? 'pointer' : 'not-allowed',
                  fontSize: '0.85rem', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '6px',
                  transition: 'all 0.2s', opacity: hasSignature && !submitting ? 1 : 0.6
                }}
              >
                <Trash2 size={14} /> Clear
              </button>
            </div>

            {/* Action Buttons */}
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
              <button
                onClick={onClose}
                disabled={submitting}
                style={{
                  padding: '12px 28px', background: 'white', color: '#7f8c8d',
                  border: '2px solid #bdc3c7', borderRadius: '8px', fontSize: '1rem', fontWeight: '600',
                  cursor: submitting ? 'not-allowed' : 'pointer', opacity: submitting ? 0.5 : 1
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleConfirm}
                disabled={!hasSignature || selectedPmIds.length === 0 || submitting}
                style={{
                  padding: '12px 28px',
                  background: hasSignature && selectedPmIds.length > 0 && !submitting ? '#27ae60' : '#bdc3c7',
                  color: 'white', border: 'none', borderRadius: '8px', fontSize: '1rem', fontWeight: '600',
                  cursor: hasSignature && selectedPmIds.length > 0 && !submitting ? 'pointer' : 'not-allowed',
                  opacity: hasSignature && selectedPmIds.length > 0 && !submitting ? 1 : 0.6
                }}
              >
                {submitting ? 'Saving...' : `Sign ${selectedPmIds.length} Records`}
              </button>
            </div>
          </>
        )}
      </div>

      <style>{`
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes slideUp { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
      `}</style>
    </div>
  );
};

export default BulkSignatureModal;