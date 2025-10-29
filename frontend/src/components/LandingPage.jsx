import { motion } from 'framer-motion'
import { useState } from 'react'
import { 
  Image, 
  Video, 
  FileText, 
  Zap, 
  Shield, 
  Users, 
  ArrowRight,
  CheckCircle,
  Star,
  Sparkles,
  Upload,
  Brain,
  Download,
  Mail,
  Phone,
  MapPin,
  Send,
  Clock,
  Target,
  TrendingUp,
  Users2,
  CheckCircle2,
  Menu,
  X,
  Sun,
  Moon
} from 'lucide-react'
import { useTheme } from '../context/ThemeContext'

const LandingPage = ({ onSignIn, onSignUp }) => {
  const { theme, toggleTheme, isDark } = useTheme()
  const [contactForm, setContactForm] = useState({
    name: '',
    email: '',
    subject: '',
    message: ''
  })
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  const scrollToSection = (sectionId) => {
    const element = document.getElementById(sectionId)
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' })
    }
  }

  const features = [
    {
      icon: Image,
      title: "Image Analysis",
      description: "Upload images and get AI-powered keyword suggestions for better SEO and content optimization."
    },
    {
      icon: Video,
      title: "Video Analysis", 
      description: "Analyze video content to extract relevant keywords and improve discoverability."
    },
    {
      icon: FileText,
      title: "Text Analysis",
      description: "Generate keywords from text prompts to enhance your content strategy."
    }
  ]

  const benefits = [
    "Multiple AI models for comprehensive analysis",
    "Real-time keyword generation and optimization",
    "Export results in multiple formats",
    "Secure and private data handling",
    "Professional-grade accuracy"
  ]

  const stats = [
    { number: "10K+", label: "Keywords Generated" },
    { number: "500+", label: "Happy Users" },
    { number: "99.9%", label: "Uptime" },
    { number: "24/7", label: "Support" }
  ]

  const howItWorks = [
    {
      step: 1,
      title: "Upload Your Content",
      description: "Upload images, videos, or enter text prompts to get started with keyword analysis.",
      icon: Upload
    },
    {
      step: 2,
      title: "AI Analysis",
      description: "Our advanced AI models analyze your content and generate relevant keywords.",
      icon: Brain
    },
    {
      step: 3,
      title: "Get Results",
      description: "Receive optimized keywords and export them in your preferred format.",
      icon: Download
    }
  ]

  const detailedFeatures = [
    {
      icon: Target,
      title: "Precision Targeting",
      description: "Get highly targeted keywords that match your content's intent and audience."
    },
    {
      icon: TrendingUp,
      title: "Trend Analysis",
      description: "Stay ahead with trending keywords and search volume insights."
    },
    {
      icon: Users2,
      title: "Multi-User Support",
      description: "Collaborate with your team and manage multiple projects efficiently."
    },
    {
      icon: Clock,
      title: "Real-Time Processing",
      description: "Get instant results with our fast and efficient AI processing."
    },
    {
      icon: Shield,
      title: "Secure & Private",
      description: "Your data is encrypted and never shared with third parties."
    },
    {
      icon: CheckCircle2,
      title: "Quality Assurance",
      description: "Every keyword is validated for relevance and search potential."
    }
  ]

  const pricingPlans = [
    {
      name: "Starter",
      price: "Free",
      period: "forever",
      description: "Perfect for individuals and small projects",
      features: [
        "5 analyses per month",
        "Basic keyword generation",
        "Standard AI models",
        "Email support",
        "Basic export formats"
      ],
      popular: false
    },
    {
      name: "Professional",
      price: "$29",
      period: "per month",
      description: "Ideal for content creators and marketers",
      features: [
        "Unlimited analyses",
        "Advanced AI models",
        "Trend analysis",
        "Priority support",
        "All export formats",
        "Team collaboration"
      ],
      popular: true
    },
    {
      name: "Enterprise",
      price: "$99",
      period: "per month",
      description: "For large teams and organizations",
      features: [
        "Everything in Professional",
        "Custom AI models",
        "API access",
        "Dedicated support",
        "Custom integrations",
        "Advanced analytics"
      ],
      popular: false
    }
  ]

  const handleContactSubmit = (e) => {
    e.preventDefault()
    // Handle form submission here
    console.log('Contact form submitted:', contactForm)
    // Reset form
    setContactForm({ name: '', email: '', subject: '', message: '' })
    alert('Thank you for your message! We\'ll get back to you soon.')
  }

  const handleContactChange = (e) => {
    setContactForm({
      ...contactForm,
      [e.target.name]: e.target.value
    })
  }

  return (
    <div className="min-h-screen bg-white dark:bg-gray-900 transition-colors duration-300">
      {/* Navigation */}
      <header className="sticky top-0 z-50 bg-white/80 dark:bg-gray-900/80 backdrop-blur-lg border-b border-gray-200/80 dark:border-gray-700/50">
        <nav className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between h-16">
          <div className="flex items-center space-x-3">
            <button onClick={() => scrollToSection('home')} aria-label="Home">
              <img
                src="/logo (1).png"
                alt="AI Keyword Generator Logo"
                className="w-10 h-10 rounded-lg object-cover ring-2 ring-blue-200"
              />
            </button>
            <button onClick={() => scrollToSection('home')} className="font-bold text-lg text-gray-900 dark:text-gray-100">AI Keyword Generator</button>
          </div>
            
          {/* Desktop Nav */}
          <div className="hidden lg:flex items-center space-x-6 text-sm font-medium text-gray-600 dark:text-gray-300">
            <button
              onClick={() => scrollToSection('home')}
              className="hover:text-gray-900 dark:hover:text-gray-100 transition-colors"
            >
              Home
            </button>
            <button
              onClick={() => scrollToSection('features')}
              className="hover:text-gray-900 dark:hover:text-gray-100 transition-colors"
            >
              Features
            </button>
            <button
              onClick={() => scrollToSection('how-it-works')}
              className="hover:text-gray-900 dark:hover:text-gray-100 transition-colors"
            >
              How It Works
            </button>
            <button
              onClick={() => scrollToSection('pricing')}
              className="hover:text-gray-900 dark:hover:text-gray-100 transition-colors"
            >
              Pricing
            </button>
            <button
              onClick={() => scrollToSection('contact')}
              className="hover:text-gray-900 dark:hover:text-gray-100 transition-colors"
            >
              Contact Us
            </button>
          </div>

          {/* Desktop Buttons */}
          <div className="hidden lg:flex items-center space-x-4">
            <button
              onClick={toggleTheme}
              className="p-2 rounded-lg bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 transition-all duration-200"
              title={`Switch to ${isDark ? 'light' : 'dark'} mode`}
            >
              {isDark ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
            </button>
            <button
              onClick={onSignIn}
              className="text-sm font-medium text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white transition-colors px-3 py-2 rounded-md border border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700/50"
            >
              Sign In
            </button>
            <button
              onClick={onSignUp}
              className="px-4 py-2 text-sm font-bold text-white dark:text-gray-900 bg-gray-900 dark:bg-gray-100 rounded-md hover:bg-gray-800 dark:hover:bg-gray-200 transition-colors"
            >
              Start Your Free Trial
            </button>
          </div>

          {/* Mobile Menu Button */}
          <div className="lg:hidden flex items-center gap-4">
            <button
              onClick={toggleTheme}
              className="p-2 rounded-lg bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 transition-all duration-200"
              title={`Switch to ${isDark ? 'light' : 'dark'} mode`}
            >
              {isDark ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
            </button>
            <button 
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)} 
              className="inline-flex items-center justify-center p-2 rounded-md text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-blue-500" 
              aria-controls="mobile-menu" 
              aria-expanded="false"
            >
              <span className="sr-only">Open main menu</span>
              {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </button>
          </div>

          {/* Mobile Menu */}
          {mobileMenuOpen && (
          <div className="lg:hidden bg-white dark:bg-gray-900" id="mobile-menu">
            <div className="px-2 pt-2 pb-3 space-y-1 sm:px-3">
              <button
                onClick={() => {
                  scrollToSection('home')
                  setMobileMenuOpen(false)
                }}
                className="block w-full text-left px-3 py-2 rounded-md text-base font-medium text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-700/50"
              >
                Home
              </button>
              <button
                onClick={() => {
                  scrollToSection('features')
                  setMobileMenuOpen(false)
                }}
                className="block w-full text-left px-3 py-2 rounded-md text-base font-medium text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-700/50"
              >
                Features
              </button>
              <button
                onClick={() => {
                  scrollToSection('how-it-works')
                  setMobileMenuOpen(false)
                }}
                className="block w-full text-left px-3 py-2 rounded-md text-base font-medium text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-700/50"
              >
                How It Works
              </button>
              <button
                onClick={() => {
                  scrollToSection('pricing')
                  setMobileMenuOpen(false)
                }}
                className="block w-full text-left px-3 py-2 rounded-md text-base font-medium text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-700/50"
              >
                Pricing
              </button>
              <button
                onClick={() => {
                  scrollToSection('contact')
                  setMobileMenuOpen(false)
                }}
                className="block w-full text-left px-3 py-2 rounded-md text-base font-medium text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-700/50"
              >
                Contact Us
              </button>
            </div>
            <div className="pt-4 pb-3 border-t border-gray-200 dark:border-gray-700">
              <div className="flex items-center px-4 space-x-3">
                <button
                  onClick={() => {
                    onSignIn()
                    setMobileMenuOpen(false)
                  }}
                  className="flex-1 text-center text-sm font-medium text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white transition-colors px-3 py-2 rounded-md border border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700/50"
                >
                  Sign In
                </button>
                <button
                  onClick={() => {
                    onSignUp()
                    setMobileMenuOpen(false)
                  }}
                  className="flex-1 text-center px-4 py-2 text-sm font-bold text-white dark:text-gray-900 bg-gray-900 dark:bg-gray-100 rounded-md hover:bg-gray-800 dark:hover:bg-gray-200 transition-colors"
                >
                  Start Free Trial
                </button>
              </div>
            </div>
          </div>
          )}
        </nav>
      </header>

      {/* Hero Section */}
      <section id="home" className="relative overflow-hidden bg-white dark:bg-gray-900 transition-colors duration-300 pt-2">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
          <div className="text-center">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              className="mb-8"
            >
              <div className="inline-flex items-center gap-2 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 px-4 py-2 rounded-full text-sm font-medium mb-6">
                <Sparkles className="w-4 h-4" />
                Powered by Advanced AI Models
              </div>
              <h1 className="text-5xl md:text-6xl font-bold text-gray-900 dark:text-white mb-6">
                Generate Keywords with
                <span className="text-gray-600 dark:text-gray-400"> AI Power</span>
              </h1>
              <p className="text-xl text-gray-600 dark:text-gray-300 max-w-3xl mx-auto mb-8">
                Transform your content strategy with our AI-powered keyword generator. 
                Analyze images, videos, and text to discover the perfect keywords for maximum reach and engagement.
              </p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="flex flex-col sm:flex-row gap-4 justify-center mb-12"
            >
              <button
                onClick={onSignUp}
                className="bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 px-8 py-4 rounded-lg font-semibold text-lg hover:bg-gray-800 dark:hover:bg-gray-200 hover:shadow-xl hover:shadow-2xl hover:-translate-y-1 transition-all duration-300 shadow-lg flex items-center justify-center gap-2"
              >
                Start Free Trial
                <ArrowRight className="w-5 h-5" />
              </button>
              <button
                onClick={onSignIn}
                className="border-2 border-gray-300 text-gray-700 px-8 py-4 rounded-lg font-semibold text-lg hover:border-gray-400 hover:bg-gray-50 hover:shadow-lg hover:-translate-y-1 transition-all duration-300 flex items-center justify-center gap-2"
              >
                Sign In
              </button>
            </motion.div>

            {/* Stats */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.4 }}
              className="grid grid-cols-2 md:grid-cols-4 gap-8 max-w-4xl mx-auto"
            >
              {stats.map((stat, index) => (
                <div key={index} className="text-center">
                  <div className="text-3xl font-bold text-gray-900 dark:text-white mb-1">{stat.number}</div>
                  <div className="text-gray-600 dark:text-gray-300">{stat.label}</div>
                </div>
              ))}
            </motion.div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-20 bg-gray-50 dark:bg-gray-800 transition-colors duration-300">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-gray-900 dark:text-white mb-4">
              Powerful AI Analysis Tools
            </h2>
            <p className="text-xl text-gray-600 dark:text-gray-300 max-w-2xl mx-auto">
              Choose from multiple analysis types to generate the perfect keywords for your content
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {features.map((feature, index) => {
              const Icon = feature.icon
              return (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6, delay: index * 0.1 }}
                  className="bg-white dark:bg-gray-900 rounded-2xl p-8 shadow-lg hover:shadow-xl hover:shadow-2xl hover:-translate-y-2 transition-all duration-300 border border-gray-100 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600"
                >
                  <div className="w-16 h-16 bg-gray-100 dark:bg-gray-800 rounded-xl flex items-center justify-center mb-6">
                    <Icon className="w-8 h-8 text-gray-600 dark:text-gray-400" />
                  </div>
                  <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">{feature.title}</h3>
                  <p className="text-gray-600 dark:text-gray-300">{feature.description}</p>
                </motion.div>
              )
            })}
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section id="how-it-works" className="py-20 bg-white dark:bg-gray-900 transition-colors duration-300">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-gray-900 dark:text-white mb-4">
              How It Works
            </h2>
            <p className="text-xl text-gray-600 dark:text-gray-300 max-w-2xl mx-auto">
              Get started with our AI keyword generator in just three simple steps
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {howItWorks.map((step, index) => {
              const Icon = step.icon
              return (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6, delay: index * 0.2 }}
                  className="text-center"
                >
                  <div className="relative mb-8">
                    <div className="w-20 h-20 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-4">
                      <Icon className="w-10 h-10 text-gray-600 dark:text-gray-400" />
                    </div>
                    <div className="absolute -top-2 -right-2 w-8 h-8 bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 rounded-full flex items-center justify-center text-sm font-bold">
                      {step.step}
                    </div>
                  </div>
                  <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">{step.title}</h3>
                  <p className="text-gray-600 dark:text-gray-300">{step.description}</p>
                </motion.div>
              )
            })}
          </div>
        </div>
      </section>

      {/* Detailed Features Section */}
      <section className="py-20 bg-gray-50 dark:bg-gray-800 transition-colors duration-300">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-gray-900 dark:text-white mb-4">
              Advanced Features
            </h2>
            <p className="text-xl text-gray-600 dark:text-gray-300 max-w-2xl mx-auto">
              Discover the powerful features that make our AI keyword generator the best choice
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {detailedFeatures.map((feature, index) => {
              const Icon = feature.icon
              return (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6, delay: index * 0.1 }}
                  className="bg-white dark:bg-gray-900 rounded-2xl p-6 shadow-lg hover:shadow-xl hover:shadow-2xl hover:-translate-y-2 transition-all duration-300 border border-gray-100 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600"
                >
                  <div className="w-12 h-12 bg-gray-100 dark:bg-gray-800 rounded-lg flex items-center justify-center mb-4">
                    <Icon className="w-6 h-6 text-gray-600 dark:text-gray-400" />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">{feature.title}</h3>
                  <p className="text-gray-600 dark:text-gray-300 text-sm">{feature.description}</p>
                </motion.div>
              )
            })}
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="py-20 bg-white dark:bg-gray-900 transition-colors duration-300">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-gray-900 dark:text-white mb-4">
              Simple, Transparent Pricing
            </h2>
            <p className="text-xl text-gray-600 dark:text-gray-300 max-w-2xl mx-auto">
              Choose the plan that fits your needs. No hidden fees, cancel anytime.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {pricingPlans.map((plan, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: index * 0.1 }}
                className={`relative bg-white dark:bg-gray-800 rounded-2xl p-8 shadow-lg hover:shadow-xl hover:shadow-2xl hover:-translate-y-2 transition-all duration-300 border-2 ${
                  plan.popular ? 'border-blue-500 hover:border-blue-600' : 'border-gray-100 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                }`}
              >
                {plan.popular && (
                  <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                    <span className="bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 px-4 py-2 rounded-full text-sm font-medium">
                      Most Popular
                    </span>
                  </div>
                )}
                
                <div className="text-center mb-8">
                  <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">{plan.name}</h3>
                  <div className="mb-4">
                    <span className="text-4xl font-bold text-gray-900 dark:text-white">{plan.price}</span>
                    <span className="text-gray-600 dark:text-gray-300 ml-2">{plan.period}</span>
                  </div>
                  <p className="text-gray-600 dark:text-gray-300">{plan.description}</p>
                </div>

                <ul className="space-y-4 mb-8">
                  {plan.features.map((feature, featureIndex) => (
                    <li key={featureIndex} className="flex items-center gap-3">
                      <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0" />
                      <span className="text-gray-700 dark:text-gray-300">{feature}</span>
                    </li>
                  ))}
                </ul>

                <button
                  onClick={plan.name === 'Starter' ? onSignUp : onSignUp}
                  className={`w-full py-3 px-6 rounded-lg font-semibold transition-all duration-300 ${
                    plan.popular
                      ? 'bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 hover:bg-gray-800 dark:hover:bg-gray-200 hover:shadow-lg hover:-translate-y-1'
                      : 'bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-100 hover:bg-gray-200 dark:hover:bg-gray-700 hover:shadow-lg hover:-translate-y-1'
                  }`}
                >
                  {plan.name === 'Starter' ? 'Get Started Free' : 'Choose Plan'}
                </button>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Benefits Section */}
      <section className="py-20 bg-white dark:bg-gray-900 transition-colors duration-300">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6 }}
            >
              <h2 className="text-4xl font-bold text-gray-900 dark:text-white mb-6">
                Why Choose Our AI Keyword Generator?
              </h2>
              <p className="text-xl text-gray-600 dark:text-gray-300 mb-8">
                Our advanced AI models provide accurate, relevant keywords that help boost your content's visibility and engagement.
              </p>
              <div className="space-y-4">
                {benefits.map((benefit, index) => (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.6, delay: index * 0.1 }}
                    className="flex items-center gap-3"
                  >
                    <CheckCircle className="w-6 h-6 text-green-500 flex-shrink-0" />
                    <span className="text-gray-700 dark:text-gray-300">{benefit}</span>
                  </motion.div>
                ))}
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="relative"
            >
              <div className="bg-gray-50 dark:bg-gray-800 rounded-2xl p-8 border border-gray-200 dark:border-gray-700">
                <div className="flex items-center gap-4 mb-6">
                  <div className="w-12 h-12 bg-gray-100 dark:bg-gray-700 rounded-lg flex items-center justify-center">
                    <Zap className="w-6 h-6 text-gray-600 dark:text-gray-400" />
                  </div>
                  <div>
                    <h3 className="text-xl font-semibold text-gray-900 dark:text-white">AI-Powered Results</h3>
                    <p className="text-gray-600 dark:text-gray-300">Get instant, accurate keyword suggestions</p>
                  </div>
                </div>
                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                    <span className="text-gray-700 dark:text-gray-300">Real-time analysis</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                    <span className="text-gray-700 dark:text-gray-300">Multiple AI models</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
                    <span className="text-gray-700 dark:text-gray-300">Export in any format</span>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Contact Form Section */}
      <section id="contact" className="py-20 bg-gray-50 dark:bg-gray-800 transition-colors duration-300">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-12">
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6 }}
            >
              <h2 className="text-4xl font-bold text-gray-900 dark:text-white mb-6">
                Get In Touch
              </h2>
              <p className="text-xl text-gray-600 dark:text-gray-300 mb-8">
                Have questions? We'd love to hear from you. Send us a message and we'll respond as soon as possible.
              </p>

              <div className="space-y-6">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/20 rounded-lg flex items-center justify-center">
                    <Mail className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900 dark:text-white">Email</h3>
                    <p className="text-gray-600 dark:text-gray-300">support@aikeywordgenerator.com</p>
                  </div>
                </div>

                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-green-100 dark:bg-green-900/20 rounded-lg flex items-center justify-center">
                    <Phone className="w-6 h-6 text-green-600 dark:text-green-400" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900 dark:text-white">Phone</h3>
                    <p className="text-gray-600 dark:text-gray-300">+1 (555) 123-4567</p>
                  </div>
                </div>

                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-purple-100 dark:bg-purple-900/20 rounded-lg flex items-center justify-center">
                    <MapPin className="w-6 h-6 text-purple-600 dark:text-purple-400" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900 dark:text-white">Office</h3>
                    <p className="text-gray-600 dark:text-gray-300">123 AI Street, Tech City, TC 12345</p>
                  </div>
                </div>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="bg-white dark:bg-gray-900 rounded-2xl p-8 shadow-lg hover:shadow-xl hover:shadow-2xl hover:-translate-y-1 transition-all duration-300 border border-gray-100 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600"
            >
              <form onSubmit={handleContactSubmit} className="space-y-6">
                <div className="grid md:grid-cols-2 gap-6">
                  <div>
                    <label htmlFor="name" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Name
                    </label>
                    <input
                      type="text"
                      id="name"
                      name="name"
                      value={contactForm.name}
                      onChange={handleContactChange}
                      required
                      className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 dark:bg-gray-800 dark:text-white rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Your name"
                    />
                  </div>
                  <div>
                    <label htmlFor="email" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Email
                    </label>
                    <input
                      type="email"
                      id="email"
                      name="email"
                      value={contactForm.email}
                      onChange={handleContactChange}
                      required
                      className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 dark:bg-gray-800 dark:text-white rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="your@email.com"
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor="subject" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Subject
                  </label>
                  <input
                    type="text"
                    id="subject"
                    name="subject"
                    value={contactForm.subject}
                    onChange={handleContactChange}
                    required
                    className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 dark:bg-gray-800 dark:text-white rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="What's this about?"
                  />
                </div>

                <div>
                  <label htmlFor="message" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Message
                  </label>
                  <textarea
                    id="message"
                    name="message"
                    value={contactForm.message}
                    onChange={handleContactChange}
                    required
                    rows={6}
                    className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 dark:bg-gray-800 dark:text-white rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Tell us more about your inquiry..."
                  />
                </div>

                <button
                  type="submit"
                  className="w-full bg-gradient-to-r from-blue-600 to-purple-600 text-white py-3 px-6 rounded-lg font-semibold hover:from-blue-700 hover:to-purple-700 transition-all duration-200 flex items-center justify-center gap-2"
                >
                  <Send className="w-5 h-5" />
                  Send Message
                </button>
              </form>
            </motion.div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-gray-900 dark:bg-gray-100">
        <div className="max-w-4xl mx-auto text-center px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <h2 className="text-4xl font-bold text-white dark:text-gray-900 mb-6">
              Ready to Transform Your Content Strategy?
            </h2>
            <p className="text-xl text-gray-300 dark:text-gray-600 mb-8">
              Join thousands of content creators who trust our AI-powered keyword generator
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <button
                onClick={onSignUp}
                className="bg-white dark:bg-gray-900 text-gray-900 dark:text-white px-8 py-4 rounded-lg font-semibold text-lg hover:bg-gray-100 dark:hover:bg-gray-800 hover:shadow-xl hover:shadow-2xl hover:-translate-y-1 transition-all duration-300 shadow-lg flex items-center justify-center gap-2"
              >
                Start Your Free Trial
                <ArrowRight className="w-5 h-5" />
              </button>
              <button
                onClick={onSignIn}
                className="border-2 border-white dark:border-gray-900 text-white dark:text-gray-900 px-8 py-4 rounded-lg font-semibold text-lg hover:bg-white dark:hover:bg-gray-900 hover:text-gray-900 dark:hover:text-white transition-all duration-200 flex items-center justify-center gap-2"
              >
                Sign In
              </button>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 dark:bg-gray-950 text-white py-12 transition-colors duration-300">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <div className="flex items-center gap-3 mb-4 md:mb-0">
              <img
                src="/logo (1).png"
                alt="AI Keyword Generator Logo"
                className="w-8 h-8 rounded-lg object-cover"
              />
              <span className="text-lg font-semibold">AI Keyword Generator</span>
            </div>
            <div className="text-gray-400 dark:text-gray-500 text-sm">
              © {new Date().getFullYear()} AI Keyword Generator. All rights reserved.
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}

export default LandingPage
