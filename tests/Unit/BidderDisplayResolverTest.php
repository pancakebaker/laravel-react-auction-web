<?php

namespace Tests\Unit;

use App\Models\User;
use App\Support\BidderDisplayResolver;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class BidderDisplayResolverTest extends TestCase
{
    use RefreshDatabase;

    public function test_known_subject_uses_local_display_name(): void
    {
        $user = User::factory()->create([
            'name' => 'Bidder Two',
            'subject_id' => '64b29e32-1308-4dba-b533-58ac885fa0be',
        ]);

        $this->assertSame('Bidder Two', app(BidderDisplayResolver::class)->resolve($user->subject_id));
    }

    public function test_known_subject_without_name_uses_a_masked_email(): void
    {
        $user = User::factory()->create([
            'name' => '',
            'email' => 'bidder.two@example.com',
            'subject_id' => '74b29e32-1308-4dba-b533-58ac885fa0be',
        ]);

        $label = app(BidderDisplayResolver::class)->resolve($user->subject_id);

        $this->assertSame('bi********@example.com', $label);
        $this->assertStringNotContainsString($user->email, $label);
    }

    public function test_unknown_and_legacy_subjects_are_safe_labels(): void
    {
        $resolver = app(BidderDisplayResolver::class);

        $this->assertSame('Bidder 64b29e32', $resolver->resolve('64b29e32-1308-4dba-b533-58ac885fa0be'));
        $this->assertSame('Carol', $resolver->resolve('carol'));
    }
}
