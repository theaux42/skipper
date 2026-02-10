import Cloudflare from 'cloudflare';
import { db } from '@/lib/db';

export async function getCloudflareClient() {
    const settings = await db.systemSetting.findMany({
        where: { key: { in: ['CF_API_TOKEN', 'CF_ACCOUNT_ID'] } }
    });

    const apiToken = settings.find((s: { key: string }) => s.key === 'CF_API_TOKEN')?.value;
    const accountId = settings.find((s: { key: string }) => s.key === 'CF_ACCOUNT_ID')?.value;

    if (!apiToken || !accountId) {
        throw new Error("Cloudflare credentials not configured in settings");
    }

    return {
        cf: new Cloudflare({ apiToken }),
        accountId
    };
}

export async function getTunnel(name: string) {
    try {
        const { cf, accountId } = await getCloudflareClient();
        // Cast to any because TS definitions might be outdated vs runtime
        const tunnels = await (cf.zeroTrust.tunnels as any).cloudflared.list({
            account_id: accountId,
            name: name,
            is_deleted: false,
        });
        if (tunnels.result && tunnels.result.length > 0) {
            return tunnels.result[0];
        }
        return null;
    } catch (e) {
        console.error("Error fetching tunnel:", e);
        return null;
    }
}

export async function createTunnel(name: string) {
    const { cf, accountId } = await getCloudflareClient();
    const tunnelSecret = Buffer.from(crypto.getRandomValues(new Uint8Array(32))).toString('base64');

    const tunnel = await (cf.zeroTrust.tunnels as any).cloudflared.create({
        account_id: accountId,
        name: name,
        tunnel_secret: tunnelSecret,
        config_src: 'cloudflare'
    });

    return { ...tunnel, tunnel_secret: tunnelSecret };
}

export async function getTunnelToken(tunnelId: string) {
    const { cf, accountId } = await getCloudflareClient();

    try {
        const response = await (cf as any).get(`/accounts/${accountId}/cfd_tunnel/${tunnelId}/token`);
        return response.result;
    } catch (e) {
        console.error("Error fetching token:", e);
        throw e;
    }
}
