import React, { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import {
    FiUpload,
    FiFile,
    FiImage,
    FiVideo,
    FiMusic,
    FiFileText,
    FiDownload,
    FiTrash2,
    FiX,
    FiEye,
    FiUser,
    FiClock,
    FiShield,
    FiAlertCircle,
    FiChevronDown,
    FiChevronUp
} from 'react-icons/fi';
import { 
    uploadEvidence, 
    fetchComplaintEvidence, 
    deleteEvidence,
    clearEvidenceError 
} from './auth/redux/evidenceSlice';
import './ComplaintProgress.css';

const ComplaintProgress = ({ complaintId, category, currentUser, isOfficer, complainerId }) => {
    const dispatch = useDispatch();
    const { evidenceList, loading, uploading, deleting, error } = useSelector((state) => state.evidence);
    
    const [activeTab, setActiveTab] = useState('view');
    const [selectedFile, setSelectedFile] = useState(null);
    const [filePreview, setFilePreview] = useState(null);
    const [evidenceType, setEvidenceType] = useState('');
    const [description, setDescription] = useState('');
    const [viewModalOpen, setViewModalOpen] = useState(false);
    const [selectedEvidence, setSelectedEvidence] = useState(null);
    const [collapsedSections, setCollapsedSections] = useState({});

    // Fetch evidence on component mount
    useEffect(() => {
        if (complaintId) {
            dispatch(fetchComplaintEvidence(complaintId));
        }
    }, [complaintId, dispatch]);

    // Handle errors
    useEffect(() => {
        if (error) {
            toast.error(error);
            dispatch(clearEvidenceError());
        }
    }, [error, dispatch]);

    const getFileIcon = (type) => {
        switch (type) {
            case 'image':
                return <FiImage />;
            case 'video':
                return <FiVideo />;
            case 'audio':
                return <FiMusic />;
            case 'document':
            case 'text':
                return <FiFileText />;
            default:
                return <FiFile />;
        }
    };

    const getFileTypeFromMime = (mimeType) => {
        if (!mimeType) return 'document';
        if (mimeType.startsWith('image/')) return 'image';
        if (mimeType.startsWith('video/')) return 'video';
        if (mimeType.startsWith('audio/')) return 'audio';
        return 'document';
    };

    const handleFileSelect = (e) => {
        const file = e.target.files[0];
        if (!file) return;

        // Validate file size (50MB max)
        if (file.size > 50 * 1024 * 1024) {
            toast.error('File size must be less than 50MB');
            return;
        }

        setSelectedFile(file);
        const type = getFileTypeFromMime(file.type);
        setEvidenceType(type);

        // Create preview for images
        if (type === 'image') {
            const reader = new FileReader();
            reader.onloadend = () => {
                setFilePreview(reader.result);
            };
            reader.readAsDataURL(file);
        } else {
            setFilePreview(null);
        }
    };

    const handleUpload = async () => {
        if (!selectedFile) {
            toast.error('Please select a file');
            return;
        }

        if (!evidenceType) {
            toast.error('Please select evidence type');
            return;
        }

        try {
            await dispatch(uploadEvidence({
                file: selectedFile,
                complaintId,
                evidenceType,
                description,
                category
            })).unwrap();

            toast.success('Evidence uploaded successfully!');
            setSelectedFile(null);
            setFilePreview(null);
            setDescription('');
            setEvidenceType('');
            setActiveTab('view'); // Switch to view tab
        } catch (error) {
            console.error('Error uploading evidence:', error);
            // Error toast handled by useEffect
        }
    };

    const handleDelete = async (evidenceId) => {
        if (!window.confirm('Are you sure you want to delete this evidence?')) {
            return;
        }

        try {
            await dispatch(deleteEvidence(evidenceId)).unwrap();
            toast.success('Evidence deleted successfully');
        } catch (error) {
            console.error('Error deleting evidence:', error);
            // Error toast handled by useEffect
        }
    };

    const handleViewEvidence = (evidence) => {
        setSelectedEvidence(evidence);
        setViewModalOpen(true);
    };

    const handleDownload = async (evidence) => {
        try {
            const response = await fetch(evidence.evidence_url);
            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = evidence.file_name || 'evidence-file';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            window.URL.revokeObjectURL(url);
            toast.success('Download started');
        } catch (error) {
            console.error('Download error:', error);
            toast.error('Failed to download file');
        }
    };

    const toggleSection = (sectionKey) => {
        setCollapsedSections(prev => ({
            ...prev,
            [sectionKey]: !prev[sectionKey]
        }));
    };

    const formatFileSize = (bytes) => {
        if (!bytes) return 'N/A';
        if (bytes < 1024) return bytes + ' B';
        if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(2) + ' KB';
        return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
    };

    const formatDate = (dateString) => {
        return new Date(dateString).toLocaleString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    const getRoleBadge = (role) => {
        switch (role) {
            case 'officer':
                return { icon: <FiShield />, label: 'Officer', class: 'role-officer' };
            case 'admin':
                return { icon: <FiShield />, label: 'Admin', class: 'role-admin' };
            case 'citizen':
            default:
                return { icon: <FiUser />, label: 'Citizen', class: 'role-citizen' };
        }
    };

    // Group evidence by role and escalation level
    const groupEvidenceByHierarchy = () => {
        const groups = {
            citizens: [],
            officers: {}
        };

        evidenceList.forEach((evidence) => {
            if (evidence.submitted_by_role === 'citizen') {
                groups.citizens.push(evidence);
            } else if (evidence.submitted_by_role === 'officer' || evidence.submitted_by_role === 'admin') {
                // Extract escalation level from evidence metadata or default to 0
                const level = evidence.escalation_level || 0;
                if (!groups.officers[level]) {
                    groups.officers[level] = [];
                }
                groups.officers[level].push(evidence);
            }
        });

        return groups;
    };

    const renderEvidenceCard = (evidence, isComplainer = false) => {
        const roleBadge = getRoleBadge(evidence.submitted_by_role);
        const canDelete = currentUser && 
            (evidence.submitted_by._id === currentUser._id || currentUser.role === 'admin');

        // Determine card class based on submitter type
        let cardClass = 'evidence-card';
        if (evidence.submitted_by_role === 'citizen') {
            if (isComplainer) {
                cardClass += ' complainer-evidence';
            } else {
                cardClass += ' other-citizen-evidence';
            }
        }

        return (
            <motion.div
                key={evidence._id}
                className={cardClass}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.3 }}
            >
                <div className="evidence-preview">
                    {evidence.evidence_type === 'image' ? (
                        <img src={evidence.evidence_url} alt={evidence.file_name} />
                    ) : (
                        <div className="evidence-icon-large">
                            {getFileIcon(evidence.evidence_type)}
                        </div>
                    )}
                </div>
                
                <div className="evidence-info">
                    <div className="evidence-header">
                        <span className="evidence-type-badge">
                            {getFileIcon(evidence.evidence_type)}
                            {evidence.evidence_type}
                        </span>
                        <span className={`role-badge ${roleBadge.class}`}>
                            {roleBadge.icon}
                            {roleBadge.label}
                        </span>
                    </div>
                    
                    <h4 className="evidence-filename">{evidence.file_name}</h4>
                    
                    {evidence.description && (
                        <p className="evidence-description">{evidence.description}</p>
                    )}
                    
                    <div className="evidence-meta">
                        <div className="meta-item">
                            <FiUser />
                            <span>{evidence.submitted_by?.name || 'Unknown'}</span>
                        </div>
                        <div className="meta-item">
                            <FiClock />
                            <span>{formatDate(evidence.createdAt)}</span>
                        </div>
                        <div className="meta-item">
                            <FiFile />
                            <span>{formatFileSize(evidence.file_size)}</span>
                        </div>
                    </div>
                    
                    <div className="evidence-actions">
                        <button
                            className="evidence-action-btn view-btn"
                            onClick={() => handleViewEvidence(evidence)}
                        >
                            <FiEye /> View
                        </button>
                        <button
                            className="evidence-action-btn download-btn"
                            onClick={() => handleDownload(evidence)}
                        >
                            <FiDownload /> Download
                        </button>
                        {canDelete && (
                            <button
                                className="evidence-action-btn delete-btn"
                                onClick={() => handleDelete(evidence._id)}
                            >
                                <FiTrash2 /> Delete
                            </button>
                        )}
                    </div>
                </div>
            </motion.div>
        );
    };

    return (
        <div className="complaint-progress-wrapper">
            <div className="progress-header">
                <h3>Progress & Evidence</h3>
                <p className="progress-subtitle">View and upload evidence related to this complaint</p>
            </div>

            {/* Tab Navigation */}
            <div className="progress-tabs">
                <button
                    className={`progress-tab ${activeTab === 'view' ? 'active' : ''}`}
                    onClick={() => setActiveTab('view')}
                >
                    <FiEye /> View Evidence ({evidenceList.length})
                </button>
                <button
                    className={`progress-tab ${activeTab === 'upload' ? 'active' : ''}`}
                    onClick={() => setActiveTab('upload')}
                >
                    <FiUpload /> Upload New
                </button>
            </div>

            {/* Tab Content */}
            <AnimatePresence mode="wait">
                {activeTab === 'view' ? (
                    <motion.div
                        key="view"
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -20 }}
                        transition={{ duration: 0.3 }}
                        className="progress-content"
                    >
                        {loading ? (
                            <div className="progress-loading">
                                <div className="loading-spinner"></div>
                                <p>Loading evidence...</p>
                            </div>
                        ) : evidenceList.length === 0 ? (
                            <div className="progress-empty">
                                <FiAlertCircle />
                                <p>No evidence uploaded yet</p>
                                <span>Be the first to contribute evidence to this complaint</span>
                            </div>
                        ) : (
                            <div className="evidence-hierarchy">
                                {(() => {
                                    const grouped = groupEvidenceByHierarchy();
                                    
                                    return (
                                        <>
                                            {/* Citizens Evidence Section */}
                                            {grouped.citizens.length > 0 && (
                                                <div className="evidence-section">
                                                    <div 
                                                        className="section-title clickable"
                                                        onClick={() => toggleSection('citizens')}
                                                    >
                                                        <FiUser className="section-icon" />
                                                        <h3>Citizens Evidence</h3>
                                                        <span className="evidence-count">{grouped.citizens.length}</span>
                                                        {collapsedSections['citizens'] ? <FiChevronDown /> : <FiChevronUp />}
                                                    </div>
                                                    {!collapsedSections['citizens'] && (
                                                        <motion.div 
                                                            className="evidence-grid"
                                                            initial={{ opacity: 0 }}
                                                            animate={{ opacity: 1 }}
                                                            exit={{ opacity: 0 }}
                                                            transition={{ duration: 0.3 }}
                                                        >
                                                            {grouped.citizens.map((evidence) => 
                                                                renderEvidenceCard(
                                                                    evidence, 
                                                                    evidence.submitted_by?._id === complainerId
                                                                )
                                                            )}
                                                        </motion.div>
                                                    )}
                                                </div>
                                            )}

                                            {/* Officers Evidence by Level */}
                                            {Object.keys(grouped.officers)
                                                .sort((a, b) => parseInt(a) - parseInt(b))
                                                .map((level) => (
                                                    <div key={`level-${level}`} className="evidence-section">
                                                        <div 
                                                            className="section-title officer-level clickable"
                                                            onClick={() => toggleSection(`officer-${level}`)}
                                                        >
                                                            <FiShield className="section-icon" />
                                                            <h3>
                                                                {level === '0' ? 'Officer Evidence (Initial)' : `Officer Evidence (Level ${level})`}
                                                            </h3>
                                                            <span className="evidence-count">{grouped.officers[level].length}</span>
                                                            {collapsedSections[`officer-${level}`] ? <FiChevronDown /> : <FiChevronUp />}
                                                        </div>
                                                        {!collapsedSections[`officer-${level}`] && (
                                                            <motion.div 
                                                                className="evidence-grid"
                                                                initial={{ opacity: 0 }}
                                                                animate={{ opacity: 1 }}
                                                                exit={{ opacity: 0 }}
                                                                transition={{ duration: 0.3 }}
                                                            >
                                                                {grouped.officers[level].map((evidence) => 
                                                                    renderEvidenceCard(evidence, false)
                                                                )}
                                                            </motion.div>
                                                        )}
                                                    </div>
                                                ))
                                            }
                                        </>
                                    );
                                })()}
                            </div>
                        )}
                    </motion.div>
                ) : (
                    <motion.div
                        key="upload"
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -20 }}
                        transition={{ duration: 0.3 }}
                        className="progress-content"
                    >
                        <div className="upload-section">
                            <div className="upload-area">
                                <input
                                    type="file"
                                    id="evidence-file"
                                    className="file-input"
                                    onChange={handleFileSelect}
                                    accept="image/*,video/*,audio/*,.pdf,.doc,.docx,.txt"
                                />
                                <label htmlFor="evidence-file" className="file-label">
                                    {selectedFile ? (
                                        <div className="file-selected">
                                            {filePreview ? (
                                                <img src={filePreview} alt="Preview" className="file-preview-img" />
                                            ) : (
                                                <div className="file-icon-preview">
                                                    {getFileIcon(evidenceType)}
                                                </div>
                                            )}
                                            <div className="file-details">
                                                <h4>{selectedFile.name}</h4>
                                                <p>{formatFileSize(selectedFile.size)}</p>
                                            </div>
                                            <button
                                                className="remove-file-btn"
                                                onClick={(e) => {
                                                    e.preventDefault();
                                                    setSelectedFile(null);
                                                    setFilePreview(null);
                                                    setEvidenceType('');
                                                }}
                                            >
                                                <FiX />
                                            </button>
                                        </div>
                                    ) : (
                                        <div className="file-prompt">
                                            <FiUpload />
                                            <h4>Click to upload or drag and drop</h4>
                                            <p>Images, videos, audio, documents (max 50MB)</p>
                                        </div>
                                    )}
                                </label>
                            </div>

                            {selectedFile && (
                                <div className="upload-form">
                                    <div className="evidence-form-group">
                                        <label>Evidence Type</label>
                                        <select
                                            value={evidenceType}
                                            onChange={(e) => setEvidenceType(e.target.value)}
                                            className="evidence-form-select"
                                        >
                                            <option value="">Select type</option>
                                            <option value="image">Image</option>
                                            <option value="video">Video</option>
                                            <option value="audio">Audio</option>
                                            <option value="document">Document</option>
                                            <option value="text">Text</option>
                                        </select>
                                    </div>

                                    <div className="evidence-form-group">
                                        <label>Description (Optional)</label>
                                        <textarea
                                            value={description}
                                            onChange={(e) => setDescription(e.target.value)}
                                            className="evidence-form-textarea"
                                            placeholder="Add a description for this evidence..."
                                            rows="3"
                                        />
                                    </div>

                                    <button
                                        className="upload-submit-btn"
                                        onClick={handleUpload}
                                        disabled={uploading || !evidenceType}
                                    >
                                        {uploading ? (
                                            <>
                                                <div className="loading-spinner-small"></div>
                                                Uploading...
                                            </>
                                        ) : (
                                            <>
                                                <FiUpload /> Upload Evidence
                                            </>
                                        )}
                                    </button>
                                </div>
                            )}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* View Modal */}
            <AnimatePresence>
                {viewModalOpen && selectedEvidence && (
                    <motion.div
                        className="evidence-modal-overlay"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={() => setViewModalOpen(false)}
                    >
                        <motion.div
                            className="evidence-modal"
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.9, opacity: 0 }}
                            onClick={(e) => e.stopPropagation()}
                        >
                            <button
                                className="modal-close-btn"
                                onClick={() => setViewModalOpen(false)}
                            >
                                <FiX />
                            </button>
                            
                            <div className="modal-content">
                                {selectedEvidence.evidence_type === 'image' ? (
                                    <img src={selectedEvidence.evidence_url} alt={selectedEvidence.file_name} />
                                ) : selectedEvidence.evidence_type === 'video' ? (
                                    <video controls src={selectedEvidence.evidence_url} />
                                ) : selectedEvidence.evidence_type === 'audio' ? (
                                    <audio controls src={selectedEvidence.evidence_url} />
                                ) : (
                                    <div className="document-preview">
                                        <FiFileText />
                                        <h3>{selectedEvidence.file_name}</h3>
                                        <a
                                            href={selectedEvidence.evidence_url}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="open-document-btn"
                                        >
                                            Open Document
                                        </a>
                                    </div>
                                )}
                                
                                <div className="modal-info">
                                    <h3>{selectedEvidence.file_name}</h3>
                                    {selectedEvidence.description && (
                                        <p className="modal-description">{selectedEvidence.description}</p>
                                    )}
                                    <div className="modal-meta">
                                        <span>Uploaded by: {selectedEvidence.submitted_by?.name || 'Unknown'}</span>
                                        <span>Date: {formatDate(selectedEvidence.createdAt)}</span>
                                        <span>Size: {formatFileSize(selectedEvidence.file_size)}</span>
                                    </div>
                                </div>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default ComplaintProgress;
