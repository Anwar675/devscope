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
          className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between"
        >
          <div className="min-w-0">
            <h1 className="mb-2 text-3xl font-bold text-white sm:text-4xl">{title}</h1>
            <p className="max-w-3xl text-blue-200/70">{description }</p>
          </div>
          {children}
        </motion.div>
    )
}
