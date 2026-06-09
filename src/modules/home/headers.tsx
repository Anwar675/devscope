"use client";
import { motion } from "motion/react";

interface HeadersProps {
    title?: string;
    description?: string;
    children?: React.ReactNode;
}


export const Headers = ({ title, description , children}: HeadersProps) => {
    return (
         <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8 flex items-start justify-between"
        >
          <div>
            <h1 className="text-4xl font-bold text-white mb-2">{title}</h1>
            <p className="text-blue-200/70">{description }</p>
          </div>
          {children}
        </motion.div>
    )
}