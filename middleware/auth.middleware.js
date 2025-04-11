import jwt from 'jsonwebtoken';

export const authenticate = (req, res, next) => {
    try {
        const token = req.cookies.token;
        
        if (!token) {
            if (req.xhr || req.headers.accept?.includes('json')) {
                return res.status(401).json({
                    success: false,
                    error: 'Authentication required'
                });
            }
            return res.redirect('/user/login?error=auth_required');
        }
        
        try {
            const decoded = jwt.verify(token, process.env.JWT_SECRET);
            req.user = decoded;
            next();
        } catch (jwtError) {
            res.clearCookie('token');
            
            if (req.xhr || req.headers.accept?.includes('json')) {
                return res.status(401).json({
                    success: false,
                    error: 'Invalid or expired token'
                });
            }
            return res.redirect('/user/login?error=invalid_token');
        }
    } catch (error) {
        console.error("Authentication error:", error);
        res.clearCookie('token');
        
        if (req.xhr || req.headers.accept?.includes('json')) {
            return res.status(500).json({
                success: false,
                error: 'Authentication system error'
            });
        }
        return res.redirect('/user/login?error=auth_error');
    }
};