import { ImageResponse } from 'next/og';

export const runtime = 'edge';

// Image metadata
export const alt = 'Bloggie AI';
export const size = {
    width: 1200,
    height: 630,
};

export const contentType = 'image/png';

export default function Image() {
    return new ImageResponse(
        (
            // ImageResponse JSX element
            <div
                style={{
                    fontSize: 128,
                    background: 'linear-gradient(to right bottom, #064e3b, #059669)',
                    width: '100%',
                    height: '100%',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'white',
                    padding: 80,
                }}
            >
                <div
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        background: 'white',
                        color: '#059669',
                        borderRadius: '24px',
                        width: 160,
                        height: 160,
                        fontSize: 100,
                        fontWeight: 900,
                        marginBottom: 40,
                        boxShadow: '0 20px 40px rgba(0,0,0,0.5)',
                    }}
                >
                    B
                </div>
                <div style={{ fontSize: 96, fontWeight: 900, letterSpacing: '-0.02em', marginBottom: 20 }}>
                    Bloggie AI
                </div>
                <div style={{ fontSize: 42, color: '#a7f3d0', fontWeight: 600, letterSpacing: '-0.01em', textAlign: 'center' }}>
                    SEO Content Engine for Local Businesses
                </div>
            </div>
        ),
        // ImageResponse options
        {
            ...size,
        }
    );
}
