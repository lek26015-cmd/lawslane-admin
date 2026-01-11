'use client';

import { motion, Variants } from 'framer-motion';
import { ReactNode } from 'react';

// Fade in from bottom
export const fadeInUp: Variants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0 }
};

// Fade in from left
export const fadeInLeft: Variants = {
    hidden: { opacity: 0, x: -20 },
    visible: { opacity: 1, x: 0 }
};

// Fade in from right
export const fadeInRight: Variants = {
    hidden: { opacity: 0, x: 20 },
    visible: { opacity: 1, x: 0 }
};

// Scale up
export const scaleUp: Variants = {
    hidden: { opacity: 0, scale: 0.9 },
    visible: { opacity: 1, scale: 1 }
};

// Stagger children container
export const staggerContainer: Variants = {
    hidden: { opacity: 0 },
    visible: {
        opacity: 1,
        transition: {
            staggerChildren: 0.1,
            delayChildren: 0.1
        }
    }
};

// Animated section with fade in up
interface AnimatedSectionProps {
    children: ReactNode;
    className?: string;
    delay?: number;
}

export function AnimatedSection({ children, className = '', delay = 0 }: AnimatedSectionProps) {
    return (
        <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.2 }}
            transition={{ duration: 0.5, delay }}
            variants={fadeInUp}
            className={className}
        >
            {children}
        </motion.div>
    );
}

// Animated card with hover effect
interface AnimatedCardProps {
    children: ReactNode;
    className?: string;
    index?: number;
}

export function AnimatedCard({ children, className = '', index = 0 }: AnimatedCardProps) {
    return (
        <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.2 }}
            transition={{ duration: 0.4, delay: index * 0.1 }}
            variants={fadeInUp}
            whileHover={{ y: -5, transition: { duration: 0.2 } }}
            className={className}
        >
            {children}
        </motion.div>
    );
}

// Animated hero section
export function AnimatedHero({ children, className = '' }: { children: ReactNode; className?: string }) {
    return (
        <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: 'easeOut' }}
            className={className}
        >
            {children}
        </motion.div>
    );
}

// Animated list with stagger effect
export function AnimatedList({ children, className = '' }: { children: ReactNode; className?: string }) {
    return (
        <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.1 }}
            variants={staggerContainer}
            className={className}
        >
            {children}
        </motion.div>
    );
}

// Animated list item
export function AnimatedListItem({ children, className = '' }: { children: ReactNode; className?: string }) {
    return (
        <motion.div
            variants={fadeInUp}
            className={className}
        >
            {children}
        </motion.div>
    );
}

// Page transition wrapper
export function PageTransition({ children, className = '' }: { children: ReactNode; className?: string }) {
    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className={className}
        >
            {children}
        </motion.div>
    );
}
