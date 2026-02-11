'use client'

import { useState } from 'react'
import { AlertTriangle, Copy, Check } from 'lucide-react'
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

interface DeleteConfirmationDialogProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    onConfirm: () => void | Promise<void>
    itemName: string
    itemType: string
    title?: string
    description?: string
    requireExactMatch?: boolean
}

export function DeleteConfirmationDialog({
    open,
    onOpenChange,
    onConfirm,
    itemName,
    itemType,
    title,
    description,
    requireExactMatch = true
}: DeleteConfirmationDialogProps) {
    const [inputValue, setInputValue] = useState('')
    const [loading, setLoading] = useState(false)
    const [copied, setCopied] = useState(false)

    const isValid = requireExactMatch ? inputValue === itemName : inputValue.trim().length > 0

    const handleCopyName = async () => {
        try {
            await navigator.clipboard.writeText(itemName)
            setCopied(true)
            setTimeout(() => setCopied(false), 2000)
        } catch (err) {
            console.error('Failed to copy:', err)
        }
    }

    const handleConfirm = async () => {
        if (!isValid) return

        setLoading(true)
        try {
            await onConfirm()
            setInputValue('')
            onOpenChange(false)
        } catch (error) {
            console.error('Delete failed:', error)
        } finally {
            setLoading(false)
        }
    }

    const handleClose = () => {
        setInputValue('')
        setCopied(false)
        onOpenChange(false)
    }

    return (
        <Dialog open={open} onOpenChange={handleClose}>
            <DialogContent className="sm:max-w-[480px]">
                <DialogHeader>
                    <div className="flex items-center gap-3 mb-2">
                        <div className="p-2 bg-red-500/10 rounded-lg">
                            <AlertTriangle className="w-5 h-5 text-red-500" />
                        </div>
                        <DialogTitle className="text-xl">
                            {title || `Delete ${itemType}?`}
                        </DialogTitle>
                    </div>
                    <DialogDescription className="text-sm leading-relaxed">
                        {description || `This action cannot be undone. This will permanently delete the ${itemType} and all associated data.`}
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-4 py-4">
                    {/* Item name display with copy button */}
                    <div className="bg-muted/50 rounded-lg p-3 border border-muted-foreground/10">
                        <div className="flex items-center justify-between gap-2">
                            <div className="flex-1 min-w-0">
                                <p className="text-xs text-muted-foreground mb-1">
                                    {itemType} name:
                                </p>
                                <p className="font-mono text-sm font-semibold break-all">
                                    {itemName}
                                </p>
                            </div>
                            <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                className="shrink-0 h-8 w-8"
                                onClick={handleCopyName}
                            >
                                {copied ? (
                                    <Check className="w-4 h-4 text-green-500" />
                                ) : (
                                    <Copy className="w-4 h-4" />
                                )}
                            </Button>
                        </div>
                    </div>

                    {/* Confirmation input */}
                    <div className="space-y-2">
                        <Label htmlFor="confirm-name">
                            {requireExactMatch
                                ? `Type the ${itemType} name to confirm`
                                : 'Type anything to confirm'}
                        </Label>
                        <Input
                            id="confirm-name"
                            value={inputValue}
                            onChange={(e) => setInputValue(e.target.value)}
                            placeholder={requireExactMatch ? itemName : 'Type to confirm'}
                            disabled={loading}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter' && isValid) {
                                    handleConfirm()
                                }
                            }}
                            autoFocus
                        />
                        {requireExactMatch && inputValue && !isValid && (
                            <p className="text-xs text-red-500">
                                Name does not match
                            </p>
                        )}
                    </div>
                </div>

                <DialogFooter>
                    <Button
                        variant="outline"
                        onClick={handleClose}
                        disabled={loading}
                    >
                        Cancel
                    </Button>
                    <Button
                        variant="destructive"
                        onClick={handleConfirm}
                        disabled={!isValid || loading}
                    >
                        {loading ? 'Deleting...' : 'Delete'}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
