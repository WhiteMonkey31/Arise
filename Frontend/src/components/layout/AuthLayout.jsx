import React from 'react'

export default function AuthLayout({children}){
	return (
		<div className="min-h-screen flex items-center justify-center ">
			<div className=" relative z-10 w-full max-w-md rounded-[28px] border border-[rgba(0,0,0,0.08)] bg-white p-8 shadow-[0_24px_60px_rgba(12,18,20,0.12)]">
				{children}
			</div>
		</div>
	)
}