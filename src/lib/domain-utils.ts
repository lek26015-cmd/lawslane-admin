export const getRootDomain = () => {
    return process.env.NEXT_PUBLIC_ROOT_DOMAIN || 'lawslane.com';
};

export const getProtocol = () => {
    return process.env.NODE_ENV === 'development' ? 'http' : 'https';
};

export const getMainLink = (path: string, currentDomain: string = 'main', forceStatic: boolean = false) => {
    if (currentDomain === 'main') return path;

    const rootDomain = getRootDomain();
    const protocol = getProtocol();

    if (!forceStatic && process.env.NODE_ENV === 'development' && typeof window !== 'undefined') {
        const currentHost = window.location.host;
        const mainHost = currentHost.replace('lawyer.', '').replace('admin.', '').replace('business.', '');
        return `${window.location.protocol}//${mainHost}${path}`;
    }

    const host = process.env.NODE_ENV === 'development' ? 'localhost:3000' : rootDomain;
    return `${protocol}://${host}${path}`;
};

export const getBusinessLink = (path: string, currentDomain: string = 'main', forceStatic: boolean = false) => {
    if (currentDomain === 'business') return path;

    const rootDomain = getRootDomain();
    const protocol = getProtocol();

    if (!forceStatic && process.env.NODE_ENV === 'development' && typeof window !== 'undefined') {
        const currentHost = window.location.host;
        const mainHost = currentHost.replace('lawyer.', '').replace('admin.', '').replace('business.', '');
        return `${window.location.protocol}//business.${mainHost}${path}`;
    }

    return `${protocol}://business.${rootDomain}${path}`;
};

export const getAdminLink = (path: string, currentDomain: string = 'main', forceStatic: boolean = false) => {
    if (currentDomain === 'admin') return path;

    const rootDomain = getRootDomain();
    const protocol = getProtocol();

    if (!forceStatic && process.env.NODE_ENV === 'development' && typeof window !== 'undefined') {
        const currentHost = window.location.host;
        const mainHost = currentHost.replace('lawyer.', '').replace('admin.', '').replace('business.', '');
        return `${window.location.protocol}//admin.${mainHost}${path}`;
    }

    return `${protocol}://admin.${rootDomain}${path}`;
};
