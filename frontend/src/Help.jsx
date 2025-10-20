import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    HelpCircle,
    BookOpen,
    MessageCircle,
    Phone,
    Mail,
    MapPin,
    Clock,
    ChevronDown,
    ChevronRight,
    Search,
    AlertCircle,
    CheckCircle,
    FileText,
    Users,
    Shield,
    Zap,
    Target,
    TrendingUp,
    Bell,
    Settings,
    Award,
    Heart,
    Star,
    ArrowRight,
    PlayCircle,
    Download,
    Upload,
    Edit,
    Trash2,
    Eye
} from 'lucide-react';
import Navbar from './Navbar';
import Footer from './Footer';
import './Help.css';

const Help = () => {
    const [activeAccordion, setActiveAccordion] = useState(null);
    const [activeCategory, setActiveCategory] = useState('getting-started');
    const [searchQuery, setSearchQuery] = useState('');
    const [currentTestimonial, setCurrentTestimonial] = useState(0);

    // FAQ Data
    const faqs = [
        {
            id: 1,
            question: "How do I register a complaint?",
            answer: "To register a complaint, click on the 'Complaint' button in the navigation bar. Fill in all the required details including title, description, category, and location. You can also upload evidence images or documents to support your complaint. Once submitted, you'll receive a confirmation with a tracking ID.",
            category: "getting-started"
        },
        {
            id: 2,
            question: "What categories of complaints can I file?",
            answer: "We support multiple categories including Railway issues, Road problems, Fire emergencies, Cyber crimes, Police matters, and Court-related complaints. Each category has specialized departments to handle your concerns efficiently.",
            category: "getting-started"
        },
        {
            id: 3,
            question: "How can I track my complaint status?",
            answer: "Go to your User Profile and click on 'My Complaints' section. Here you'll see all your complaints with their current status (Pending, In Progress, Resolved, or Rejected). You can click on any complaint to view detailed information and updates.",
            category: "complaints"
        },
        {
            id: 4,
            question: "Can I edit or delete my complaint?",
            answer: "Yes, you can edit your complaint details before it's assigned to an officer. Once assigned, editing is restricted, but you can add comments. You can delete your complaint at any time from the 'My Complaints' section.",
            category: "complaints"
        },
        {
            id: 5,
            question: "What is the Trending page?",
            answer: "The Trending page shows complaints that are gaining attention in your area. You can upvote complaints you agree with, downvote those you don't, and add comments to support or provide additional information. This helps prioritize issues that affect the community.",
            category: "features"
        },
        {
            id: 6,
            question: "How does the Analytics feature work?",
            answer: "Analytics provides insights into complaints within a 10km radius of your location. It shows category distribution, resolution rates, trending patterns, and hotspot locations. This helps you understand common issues in your area and their resolution status.",
            category: "features"
        },
        {
            id: 7,
            question: "Is my personal information secure?",
            answer: "Absolutely! We use industry-standard encryption for all data transmission and storage. Your personal information is never shared with third parties without your consent. We comply with all data protection regulations.",
            category: "security"
        },
        {
            id: 8,
            question: "How long does it take to resolve a complaint?",
            answer: "Resolution time varies by category and severity. Emergency complaints (high severity) are prioritized and typically addressed within 24-48 hours. Medium priority complaints may take 3-7 days, while low priority issues can take up to 14 days.",
            category: "complaints"
        },
        {
            id: 9,
            question: "Can I provide feedback on complaint resolution?",
            answer: "Yes! Once your complaint is marked as resolved, you can provide a rating (1-5 stars) and written feedback about the resolution process. This helps us improve our services and hold authorities accountable.",
            category: "features"
        },
        {
            id: 10,
            question: "What should I do in case of an emergency?",
            answer: "For immediate emergencies, always call your local emergency services first (911, 112, etc.). Use our platform for non-urgent issues or to document emergency situations for follow-up and tracking purposes.",
            category: "getting-started"
        }
    ];

    // Category Data
    const categories = [
        { id: 'getting-started', name: 'Getting Started', icon: PlayCircle, color: '#3b82f6' },
        { id: 'complaints', name: 'Managing Complaints', icon: FileText, color: '#10b981' },
        { id: 'features', name: 'Features & Tools', icon: Zap, color: '#f59e0b' },
        { id: 'security', name: 'Security & Privacy', icon: Shield, color: '#ef4444' }
    ];

    // How It Works Steps
    const steps = [
        {
            id: 1,
            title: "Sign Up",
            description: "Create your account with basic details and location information",
            icon: Users,
            color: '#3b82f6'
        },
        {
            id: 2,
            title: "File Complaint",
            description: "Submit your complaint with details, category, and supporting evidence",
            icon: Upload,
            color: '#10b981'
        },
        {
            id: 3,
            title: "Track Progress",
            description: "Monitor your complaint status and receive real-time updates",
            icon: Eye,
            color: '#f59e0b'
        },
        {
            id: 4,
            title: "Get Resolved",
            description: "Your issue gets addressed by the relevant authority",
            icon: CheckCircle,
            color: '#8b5cf6'
        }
    ];

    // Testimonials
    const testimonials = [
        {
            id: 1,
            name: "Rajesh Kumar",
            role: "Citizen",
            avatar: "https://i.pravatar.cc/150?img=12",
            rating: 5,
            text: "This platform made it so easy to report a road issue in my area. Within 3 days, the problem was fixed! Highly recommend."
        },
        {
            id: 2,
            name: "Priya Sharma",
            role: "Local Business Owner",
            avatar: "https://i.pravatar.cc/150?img=5",
            rating: 5,
            text: "The trending feature helped me understand common issues in my neighborhood. Great tool for community awareness!"
        },
        {
            id: 3,
            name: "Amit Patel",
            role: "Student",
            avatar: "https://i.pravatar.cc/150?img=33",
            rating: 4,
            text: "Love the analytics dashboard! It gives clear insights into area problems. User interface is very intuitive."
        }
    ];

    // Features Data
    const features = [
        {
            id: 1,
            title: "Real-time Tracking",
            description: "Track your complaint status in real-time with instant notifications",
            icon: Bell,
            color: '#3b82f6'
        },
        {
            id: 2,
            title: "Community Voting",
            description: "Vote on complaints to highlight important community issues",
            icon: TrendingUp,
            color: '#10b981'
        },
        {
            id: 3,
            title: "Analytics Dashboard",
            description: "View detailed analytics of complaints in your area",
            icon: Target,
            color: '#f59e0b'
        },
        {
            id: 4,
            title: "Evidence Upload",
            description: "Attach photos, videos, and documents to support your complaint",
            icon: Upload,
            color: '#ef4444'
        },
        {
            id: 5,
            title: "Secure & Private",
            description: "Your data is encrypted and protected with industry standards",
            icon: Shield,
            color: '#8b5cf6'
        },
        {
            id: 6,
            title: "Multi-category Support",
            description: "File complaints across rail, road, fire, cyber, police, and court",
            icon: Settings,
            color: '#ec4899'
        }
    ];

    // Animation Variants
    const containerVariants = {
        hidden: { opacity: 0 },
        visible: {
            opacity: 1,
            transition: {
                staggerChildren: 0.1
            }
        }
    };

    const itemVariants = {
        hidden: { y: 20, opacity: 0 },
        visible: {
            y: 0,
            opacity: 1,
            transition: {
                type: 'spring',
                stiffness: 100
            }
        }
    };

    const toggleAccordion = (id) => {
        setActiveAccordion(activeAccordion === id ? null : id);
    };

    const filteredFAQs = faqs.filter(faq => 
        faq.category === activeCategory &&
        (faq.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
         faq.answer.toLowerCase().includes(searchQuery.toLowerCase()))
    );

    const nextTestimonial = () => {
        setCurrentTestimonial((prev) => (prev + 1) % testimonials.length);
    };

    const prevTestimonial = () => {
        setCurrentTestimonial((prev) => (prev - 1 + testimonials.length) % testimonials.length);
    };

    return (
        <div className="help-page">
            <Navbar />
            
            {/* Hero Section */}
            <motion.section 
                className="help-hero"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.8 }}
            >
                <div className="help-hero-background">
                    <div className="hero-bg-element"></div>
                    <div className="hero-bg-element"></div>
                    <div className="hero-bg-element"></div>
                </div>
                
                <div className="help-hero-content">
                    <motion.div
                        initial={{ y: 30, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        transition={{ delay: 0.2, duration: 0.6 }}
                        className="hero-icon-container"
                    >
                        <HelpCircle size={64} />
                    </motion.div>
                    
                    <motion.h1
                        initial={{ y: 30, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        transition={{ delay: 0.3, duration: 0.6 }}
                        className="help-hero-title"
                    >
                        How Can We Help You?
                    </motion.h1>
                    
                    <motion.p
                        initial={{ y: 30, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        transition={{ delay: 0.4, duration: 0.6 }}
                        className="help-hero-subtitle"
                    >
                        Find answers to your questions and learn how to make the most of our platform
                    </motion.p>
                    
                    <motion.div
                        initial={{ y: 30, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        transition={{ delay: 0.5, duration: 0.6 }}
                        className="help-search-container"
                    >
                        <Search className="help-search-icon" />
                        <input
                            type="text"
                            placeholder="Search for help..."
                            className="help-search-input"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </motion.div>
                </div>
            </motion.section>

            {/* Quick Links Section */}
            <section className="help-quick-links">
                <div className="help-container">
                    <motion.div
                        variants={containerVariants}
                        initial="hidden"
                        whileInView="visible"
                        viewport={{ once: true }}
                        className="quick-links-grid"
                    >
                        {categories.map((category, index) => {
                            const Icon = category.icon;
                            return (
                                <motion.button
                                    key={category.id}
                                    variants={itemVariants}
                                    className={`quick-link-card ${activeCategory === category.id ? 'active' : ''}`}
                                    onClick={() => setActiveCategory(category.id)}
                                    whileHover={{ scale: 1.05, y: -5 }}
                                    whileTap={{ scale: 0.95 }}
                                >
                                    <div 
                                        className="quick-link-icon"
                                        style={{ background: `linear-gradient(135deg, ${category.color}, ${category.color}dd)` }}
                                    >
                                        <Icon size={28} />
                                    </div>
                                    <h3 className="quick-link-title">{category.name}</h3>
                                    <ChevronRight className="quick-link-arrow" />
                                </motion.button>
                            );
                        })}
                    </motion.div>
                </div>
            </section>

            {/* How It Works Section */}
            <section className="help-how-it-works">
                <div className="help-container">
                    <motion.div
                        initial={{ opacity: 0, y: 30 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.6 }}
                        className="help-section-header"
                    >
                        <BookOpen className="help-section-icon" />
                        <h2 className="help-section-title">How It Works</h2>
                        <p className="help-section-subtitle">
                            Get started in just 4 simple steps
                        </p>
                    </motion.div>

                    <motion.div
                        variants={containerVariants}
                        initial="hidden"
                        whileInView="visible"
                        viewport={{ once: true }}
                        className="steps-grid"
                    >
                        {steps.map((step, index) => {
                            const Icon = step.icon;
                            return (
                                <motion.div
                                    key={step.id}
                                    variants={itemVariants}
                                    className="step-card"
                                    whileHover={{ y: -10 }}
                                >
                                    <div className="step-number">{step.id}</div>
                                    <div 
                                        className="step-icon"
                                        style={{ background: `linear-gradient(135deg, ${step.color}, ${step.color}dd)` }}
                                    >
                                        <Icon size={32} />
                                    </div>
                                    <h3 className="step-title">{step.title}</h3>
                                    <p className="step-description">{step.description}</p>
                                    {index < steps.length - 1 && (
                                        <div className="step-connector">
                                            <ArrowRight />
                                        </div>
                                    )}
                                </motion.div>
                            );
                        })}
                    </motion.div>
                </div>
            </section>

            {/* Features Section */}
            <section className="help-features">
                <div className="help-container">
                    <motion.div
                        initial={{ opacity: 0, y: 30 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.6 }}
                        className="help-section-header"
                    >
                        <Zap className="help-section-icon" />
                        <h2 className="help-section-title">Platform Features</h2>
                        <p className="help-section-subtitle">
                            Powerful tools to help you manage and track complaints
                        </p>
                    </motion.div>

                    <motion.div
                        variants={containerVariants}
                        initial="hidden"
                        whileInView="visible"
                        viewport={{ once: true }}
                        className="features-grid"
                    >
                        {features.map((feature) => {
                            const Icon = feature.icon;
                            return (
                                <motion.div
                                    key={feature.id}
                                    variants={itemVariants}
                                    className="feature-card"
                                    whileHover={{ scale: 1.03, y: -5 }}
                                >
                                    <div 
                                        className="feature-icon"
                                        style={{ background: `linear-gradient(135deg, ${feature.color}, ${feature.color}dd)` }}
                                    >
                                        <Icon size={24} />
                                    </div>
                                    <h3 className="feature-title">{feature.title}</h3>
                                    <p className="feature-description">{feature.description}</p>
                                </motion.div>
                            );
                        })}
                    </motion.div>
                </div>
            </section>

            {/* FAQ Section with Accordion */}
            <section className="help-faq">
                <div className="help-container">
                    <motion.div
                        initial={{ opacity: 0, y: 30 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.6 }}
                        className="help-section-header"
                    >
                        <MessageCircle className="help-section-icon" />
                        <h2 className="help-section-title">Frequently Asked Questions</h2>
                        <p className="help-section-subtitle">
                            Find quick answers to common questions
                        </p>
                    </motion.div>

                    <motion.div
                        initial={{ opacity: 0 }}
                        whileInView={{ opacity: 1 }}
                        viewport={{ once: true }}
                        className="faq-content"
                    >
                        {filteredFAQs.map((faq, index) => (
                            <motion.div
                                key={faq.id}
                                initial={{ opacity: 0, y: 20 }}
                                whileInView={{ opacity: 1, y: 0 }}
                                viewport={{ once: true }}
                                transition={{ delay: index * 0.1 }}
                                className="faq-item"
                            >
                                <button
                                    className={`faq-question ${activeAccordion === faq.id ? 'active' : ''}`}
                                    onClick={() => toggleAccordion(faq.id)}
                                >
                                    <span className="faq-question-text">{faq.question}</span>
                                    <motion.div
                                        animate={{ rotate: activeAccordion === faq.id ? 180 : 0 }}
                                        transition={{ duration: 0.3 }}
                                    >
                                        <ChevronDown className="faq-icon" />
                                    </motion.div>
                                </button>
                                
                                <AnimatePresence>
                                    {activeAccordion === faq.id && (
                                        <motion.div
                                            initial={{ height: 0, opacity: 0 }}
                                            animate={{ height: 'auto', opacity: 1 }}
                                            exit={{ height: 0, opacity: 0 }}
                                            transition={{ duration: 0.3 }}
                                            className="faq-answer"
                                        >
                                            <p>{faq.answer}</p>
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </motion.div>
                        ))}
                    </motion.div>
                </div>
            </section>

            {/* Testimonials Carousel */}
            <section className="help-testimonials">
                <div className="help-container">
                    <motion.div
                        initial={{ opacity: 0, y: 30 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.6 }}
                        className="help-section-header"
                    >
                        <Heart className="help-section-icon" />
                        <h2 className="help-section-title">What Our Users Say</h2>
                        <p className="help-section-subtitle">
                            Real experiences from real people
                        </p>
                    </motion.div>

                    <div className="testimonial-carousel">
                        <AnimatePresence mode="wait">
                            <motion.div
                                key={currentTestimonial}
                                initial={{ opacity: 0, x: 100 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: -100 }}
                                transition={{ duration: 0.5 }}
                                className="testimonial-card"
                            >
                                <div className="testimonial-avatar">
                                    <img src={testimonials[currentTestimonial].avatar} alt={testimonials[currentTestimonial].name} />
                                </div>
                                <div className="testimonial-rating">
                                    {[...Array(testimonials[currentTestimonial].rating)].map((_, i) => (
                                        <Star key={i} size={20} fill="#fbbf24" color="#fbbf24" />
                                    ))}
                                </div>
                                <p className="testimonial-text">"{testimonials[currentTestimonial].text}"</p>
                                <h4 className="testimonial-name">{testimonials[currentTestimonial].name}</h4>
                                <p className="testimonial-role">{testimonials[currentTestimonial].role}</p>
                            </motion.div>
                        </AnimatePresence>

                        <div className="testimonial-controls">
                            <button onClick={prevTestimonial} className="testimonial-btn">
                                <ChevronDown style={{ transform: 'rotate(90deg)' }} />
                            </button>
                            <div className="testimonial-dots">
                                {testimonials.map((_, index) => (
                                    <button
                                        key={index}
                                        className={`testimonial-dot ${index === currentTestimonial ? 'active' : ''}`}
                                        onClick={() => setCurrentTestimonial(index)}
                                    />
                                ))}
                            </div>
                            <button onClick={nextTestimonial} className="testimonial-btn">
                                <ChevronDown style={{ transform: 'rotate(-90deg)' }} />
                            </button>
                        </div>
                    </div>
                </div>
            </section>

            {/* Contact Support Section */}
            <section className="help-contact">
                <div className="help-container">
                    <motion.div
                        initial={{ opacity: 0, y: 30 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.6 }}
                        className="help-section-header"
                    >
                        <Phone className="help-section-icon" />
                        <h2 className="help-section-title">Still Need Help?</h2>
                        <p className="help-section-subtitle">
                            Our support team is here to assist you
                        </p>
                    </motion.div>

                    <motion.div
                        variants={containerVariants}
                        initial="hidden"
                        whileInView="visible"
                        viewport={{ once: true }}
                        className="help-contact-grid"
                    >
                        <motion.div variants={itemVariants} className="help-contact-card">
                            <div className="help-contact-icon" style={{ background: 'linear-gradient(135deg, #3b82f6, #60a5fa)' }}>
                                <Mail size={28} />
                            </div>
                            <h3 className="help-contact-title">Email Support</h3>
                            <p className="help-contact-description">Get help via email</p>
                            <a href="mailto:support@rescue.com" className="help-contact-link">
                                support@rescue.com
                            </a>
                        </motion.div>

                        <motion.div variants={itemVariants} className="help-contact-card">
                            <div className="help-contact-icon" style={{ background: 'linear-gradient(135deg, #10b981, #34d399)' }}>
                                <Phone size={28} />
                            </div>
                            <h3 className="help-contact-title">Phone Support</h3>
                            <p className="help-contact-description">Call us directly</p>
                            <a href="tel:+1234567890" className="help-contact-link">
                                +1 (234) 567-890
                            </a>
                        </motion.div>

                        <motion.div variants={itemVariants} className="help-contact-card">
                            <div className="help-contact-icon" style={{ background: 'linear-gradient(135deg, #f59e0b, #fbbf24)' }}>
                                <Clock size={28} />
                            </div>
                            <h3 className="help-contact-title">Business Hours</h3>
                            <p className="help-contact-description">We're available</p>
                            <p className="help-contact-link">
                                Mon-Fri: 9AM - 6PM
                            </p>
                        </motion.div>
                    </motion.div>
                </div>
            </section>

            <Footer />
        </div>
    );
};

export default Help;
