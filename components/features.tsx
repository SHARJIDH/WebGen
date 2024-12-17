'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { Code2, Wand2, Rocket, Sparkles } from 'lucide-react';

const features = [
  {
    title: 'AI-Powered Generation',
    description: 'Harness the power of AI to transform your ideas into beautiful websites.',
    icon: Wand2,
  },
  {
    title: 'Clean Code',
    description: 'Generate production-ready, well-structured code that follows best practices.',
    icon: Code2,
  },
  {
    title: 'Rapid Development',
    description: 'Build websites faster than ever with our intelligent automation.',
    icon: Rocket,
  },
  {
    title: 'Custom Features',
    description: 'Add specialized functionality tailored to your specific needs.',
    icon: Sparkles,
  },
];

export const FeaturesSection = () => {
  return (
    <section className="py-20 bg-gradient-to-br from-blue-950 via-blue-900 to-blue-800">
      <div className="container mx-auto px-4">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-4 bg-gradient-to-r from-blue-400 to-blue-200 bg-clip-text text-transparent">
            Powerful Features
          </h2>
          <p className="text-blue-200 max-w-2xl mx-auto">
            Everything you need to build your next website, powered by cutting-edge AI technology.
          </p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {features.map((feature, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
              className="p-6 rounded-xl bg-blue-950/20 backdrop-blur-lg border border-blue-800/30 hover:border-blue-700/50 transition-all"
            >
              <div className="w-12 h-12 bg-blue-900/50 rounded-lg flex items-center justify-center mb-4">
                {React.createElement(feature.icon, {
                  className: "w-6 h-6 text-blue-400",
                })}
              </div>
              <h3 className="text-xl font-semibold text-white mb-2">
                {feature.title}
              </h3>
              <p className="text-blue-200">
                {feature.description}
              </p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};
