<?php

namespace App\Support;

use App\Models\User;
use Illuminate\Support\Str;

/**
 * Resolves opaque bidder subjects to safe labels for public presentation.
 *
 * Bidder subjects remain the canonical integration identity. This class only
 * returns display text and limits lookups to users belonging to this tenant.
 */
final class BidderDisplayResolver
{
    /**
     * @param  list<string>  $bidderIds
     * @return array<string, string>
     */
    public function resolveMany(array $bidderIds): array
    {
        $ids = array_values(array_unique(array_filter(
            array_map(static fn (mixed $id): string => trim((string) $id), $bidderIds),
            static fn (string $id): bool => $id !== '',
        )));

        if ($ids === []) {
            return [];
        }

        $users = User::query()
            ->where('tenant_id', app(TenantContext::class)->id())
            ->whereIn('subject_id', $ids)
            ->get(['subject_id', 'name', 'email'])
            ->keyBy('subject_id');

        return array_combine(
            $ids,
            array_map(function (string $id) use ($users): string {
                $user = $users->get($id);

                if ($user !== null && trim((string) $user->name) !== '') {
                    return trim((string) $user->name);
                }

                if ($user !== null && trim((string) $user->email) !== '') {
                    return $this->maskEmail((string) $user->email);
                }

                return $this->fallback($id);
            }, $ids),
        );
    }

    public function resolve(string $bidderId): string
    {
        return $this->resolveMany([$bidderId])[$bidderId] ?? $this->fallback($bidderId);
    }

    private function fallback(string $bidderId): string
    {
        $trimmed = trim($bidderId);
        if ($trimmed === '') {
            return 'Unknown bidder';
        }

        if (! Str::isUuid($trimmed)) {
            return Str::of($trimmed)->replace(['_', '-'], ' ')->title()->toString();
        }

        return 'Bidder '.substr($trimmed, 0, 8);
    }

    private function maskEmail(string $email): string
    {
        [$local, $domain] = array_pad(explode('@', $email, 2), 2, '');
        $visible = substr($local, 0, min(2, strlen($local)));
        $mask = str_repeat('*', max(2, strlen($local) - strlen($visible)));

        return $visible.$mask.($domain !== '' ? '@'.$domain : '');
    }
}
