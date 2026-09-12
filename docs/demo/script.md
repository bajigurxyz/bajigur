# Demo video scripts

Two clips, under four minutes together. The opener carries the story, the demo
carries the proof, so neither has to do both.

| Clip | Length | Source |
| --- | --- | --- |
| Opener | 30s | `video/`, rendered with Remotion, `bun run render` |
| Demo | 3:27 | `draft-demo-bajigur.mp4`, screen recording |

## Opener, voiceover

Problem first, then the turn. No product tour: the demo does that. 61 words
over 30 seconds, cued to what is on screen.

```
0:00  Every prompt like this one lives behind a subscription.

0:05  Nineteen a month. Seventy nine. A hundred and ninety nine.
0:10  [ let the number sit ]

0:11  You wanted one prompt. You paid for a year.

0:16  Here, one prompt costs twenty cents, bought by the agent itself.

0:21  Hedera settles it. Privy holds the wallet.
0:24  ENS names the creator, and ERC-8004 decides which prompt wins.

0:27  What follows is one real purchase, unedited.
```

## Demo, voiceover keyed to `draft-demo-bajigur.mp4`

242 words over 207 seconds, about 70 words a minute. The two silences are
deliberate: at 2:05 the ratings table appears and has to be read, and at 3:06
the finished page appears and has to be seen.

```
0:01  A real purchase on Hedera testnet, start to finish.

0:08  Signing in is an email address. Privy makes the wallet.
0:14  No seed phrase. Bajigur funds the Hedera account behind it.
0:22  This grants us a signer. Every payment is capped, and revocable.

0:30  Now a name, on ENS version two. We pay that gas.
0:37  It is registered to their wallet, not ours.
0:42  And it carries their Hedera account. That record is the payout.

0:52  One URL, pasted into Claude Desktop. No key on this machine.
1:02  The wallet stays where it was made. The agent only borrows it.

1:16  The consent screen says exactly what it may do.
1:23  Buy prompts, paying only Bajigur creators, every payment capped.

1:40  Now the ask. Find a design, buy it, build with it.
1:48  Reading the catalogue is free, so it looks before it spends.
1:58  Watch what it does next.

2:05  [ silence, the ratings table appears ]

2:07  It chose the more expensive one, on purpose.
2:12  One buyer rated that creator on chain, through ERC-8004.
2:17  The other has none, so the registry broke the tie.

2:23  Paid. Twenty cents of USDC, over x402 on Hedera.
2:28  The licence is minted to the buyer.

2:33  That transaction on HashScan. Nothing rehearsed.
2:38  Twenty cents leaving the buyer, landing on the creator.

2:46  The prompt lives in the wallet now, not in a session.
2:52  Any client, same wallet, free to read again.

3:06  [ silence, the finished page appears ]

3:09  That page was built from the prompt it just bought.
3:15  Hedera settled it. Privy signed it. ENS named the creator.
3:20  ERC-8004 is why this one was chosen.
```

## What the demo shows, with timecodes

```
0:00  landing page
0:07  sign in with Privy, wallet created
0:20  grant the signer, capped
0:27  claim demohack.bajigur.eth on ENSv2, platform pays the Sepolia gas
0:39  balances and the cap
0:48  add the MCP server to Claude Desktop by URL
1:14  OAuth consent, then connected
1:40  the ask: find a design, buy it, build with it
2:05  two prompts, two creators, one rating: the agent takes the rated one
2:11  paid, licence minted
2:31  the transaction on HashScan, 0.20 USDC to the creator
2:44  the build
3:06  the finished page
```
