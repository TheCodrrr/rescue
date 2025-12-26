import { useState } from "react";

const CloudImage = ({ src, alt, className }) => {
    const [loaded, setLoaded] = useState(false);
    const lqip = src.replace("/upload/", "/upload/w_20,q_10,e_blur:1000/");

    return (
        <img
            src={loaded ? src : lqip}
            alt={alt}
            className={className}
            onLoad={() => setLoaded(true)}
            style={{
                transition: "filter 0.3s ease-out",
                filter: loaded ? "blur(0px)" : "blur(6px)",
            }}
            loading="lazy"
        />
    )
}

export default CloudImage;