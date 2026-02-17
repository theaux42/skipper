
import { CloudflareSetup } from '@/components/cloudflare/setup'
import { TunnelsList } from '@/components/cloudflare/tunnels-list'
import { TunnelSetupButton } from '@/components/cloudflare/tunnel-setup-button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'

export default function CloudflarePage() {
    return (
        <div className="container mx-auto p-8 max-w-7xl animate-in fade-in duration-500">
            <h1 className="heading-display text-4xl mb-2">Cloudflare <em className="heading-display-italic">Integration</em></h1>
            <p className="text-muted-foreground mb-8 text-body">Manage tunnels, domains, and access settings.</p>

            <Tabs defaultValue="setup" className="w-full space-y-6">
                <TabsList>
                    <TabsTrigger value="setup">Configuration</TabsTrigger>
                    <TabsTrigger value="tunnels">Tunnels</TabsTrigger>
                </TabsList>

                <TabsContent value="setup" className="space-y-6">
                    <CloudflareSetup />
                    <TunnelSetupButton />
                </TabsContent>

                <TabsContent value="tunnels">
                    <TunnelsList />
                </TabsContent>
            </Tabs>
        </div>
    )
}
