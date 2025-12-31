import React, { useEffect, useRef } from "react";

const ParticleBackground = () => {
    const canvasRef = useRef(null);

    useEffect(() => {
        const canvas = canvasRef.current;
        const ctx = canvas.getContext("2d");
        let animationFrameId;

        // Set dimensions
        const setDimensions = () => {
            canvas.width = window.innerWidth;
            canvas.height = window.innerHeight;
        };
        setDimensions();
        window.addEventListener("resize", setDimensions);

        // Particle configuration
        const particles = [];
        const particleCount = 100;
        const connectionDistance = 150;
        const mouseDistance = 200;

        let mouse = { x: null, y: null };

        // Particle Class
        class Particle {
            constructor() {
                this.x = Math.random() * canvas.width;
                this.y = Math.random() * canvas.height;
                this.dx = (Math.random() - 0.5) * 1; // Velocity X
                this.dy = (Math.random() - 0.5) * 1; // Velocity Y
                this.size = Math.random() * 2 + 1;
            }

            update() {
                // Determine new position
                this.x += this.dx;
                this.y += this.dy;

                // Bounce off edges
                if (this.x < 0 || this.x > canvas.width) this.dx = -this.dx;
                if (this.y < 0 || this.y > canvas.height) this.dy = -this.dy;

                // Mouse interactivity
                if (mouse.x != null) {
                    const dx = mouse.x - this.x;
                    const dy = mouse.y - this.y;
                    const distance = Math.sqrt(dx * dx + dy * dy);

                    if (distance < mouseDistance) {
                        const forceDirectionX = dx / distance;
                        const forceDirectionY = dy / distance;
                        const force = (mouseDistance - distance) / mouseDistance;
                        const directionX = forceDirectionX * force * 3;
                        const directionY = forceDirectionY * force * 3;

                        this.x -= directionX;
                        this.y -= directionY;
                    }
                }

                this.draw();
            }

            draw() {
                ctx.fillStyle = "rgba(234, 88, 12, 0.4)"; // Primary Orange (primary-600)
                ctx.beginPath();
                ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
                ctx.fill();
            }
        }

        // Initialize particles
        for (let i = 0; i < particleCount; i++) {
            particles.push(new Particle());
        }

        // Mouse listeners
        const handleMouseMove = (e) => {
            mouse.x = e.x;
            mouse.y = e.y;
        };
        const handleMouseLeave = () => {
            mouse.x = null;
            mouse.y = null;
        };

        window.addEventListener("mousemove", handleMouseMove);
        window.addEventListener("mouseout", handleMouseLeave);

        // Animation Loop
        const animate = () => {
            ctx.clearRect(0, 0, canvas.width, canvas.height);

            // Draw connections
            for (let a = 0; a < particles.length; a++) {
                for (let b = a; b < particles.length; b++) {
                    const dx = particles[a].x - particles[b].x;
                    const dy = particles[a].y - particles[b].y;
                    const distance = Math.sqrt(dx * dx + dy * dy);

                    if (distance < connectionDistance) {
                        ctx.beginPath();
                        ctx.strokeStyle = `rgba(234, 88, 12, ${1 - distance / connectionDistance})`; // Fading orange
                        ctx.lineWidth = 1;
                        ctx.moveTo(particles[a].x, particles[a].y);
                        ctx.lineTo(particles[b].x, particles[b].y);
                        ctx.stroke();
                    }
                }
                particles[a].update();
            }
            animationFrameId = requestAnimationFrame(animate);
        };

        animate();

        return () => {
            window.removeEventListener("resize", setDimensions);
            window.removeEventListener("mousemove", handleMouseMove);
            window.removeEventListener("mouseout", handleMouseLeave);
            cancelAnimationFrame(animationFrameId);
        };
    }, []);

    return <canvas ref={canvasRef} className="absolute top-0 left-0 w-full h-full pointer-events-none" />;
};

export default ParticleBackground;
