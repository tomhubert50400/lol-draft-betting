# LoL Draft Betting

Web application for betting on League of Legends champion drafts during Karmine Corp (KC) watchparties in Seoul. Predict champion compositions and compete on leaderboards!

## About

This application was created to allow Karmine Corp fans to bet on LoL drafts during watchparties organized in Seoul. Predict the champion compositions that teams will select and earn points based on your accuracy!

## Features

- 🎯 **Draft Predictions**: Place bets on champion compositions for League of Legends matches
- 🏆 **Leaderboard**: Compete with other players and track your ranking
- 🎖️ **Badge System**: Unlock badges and achievements as you play
- 📊 **Advanced Statistics**: Track your accuracy by role, top predicted champions, and more
- 🔥 **Bo1/Bo3/Bo5 Support**: Support for best-of series with fearless draft
- 👥 **User Profiles**: Customizable profiles with social links
- 🔐 **Admin Dashboard**: Full admin control for match management

## Tech Stack

- **Frontend**: React 18 + Vite
- **Backend**: Firebase (Authentication, Firestore, Cloud Functions)
- **Routing**: React Router v6
- **Styling**: CSS with CSS Variables

## Visit

https://draft.zerqua.com/

## Features in Detail

### Draft Betting System

- Users can place bets on champion drafts for upcoming matches
- Supports Bo1, Bo3, and Bo5 series
- Fearless draft: champions used in previous games are excluded
- Scoring system: 1 point per correct prediction, 12 points for perfect 10/10

### Badge System

- First Bet: Unlocked on first bet
- Dedicated Bettor: 10 bets
- Veteran: 50 bets
- Perfect Score: Achieve a perfect 10/10 prediction
- Top Scorer: Reach 1000+ total points
- Top 10: Rank in top 10 on leaderboard

### Admin Features

- Create and manage events
- Create matches (Bo1/Bo3/Bo5)
- Resolve matches and calculate scores
- Manage users (change passwords, delete accounts, modify scores)
- Delete matches and events

## Use Case

This application is specifically designed for Karmine Corp watchparties in Seoul. Users can:

- Bet on drafts before each match
- Track their performance and compare with other fans
- Earn badges based on their predictions
- View detailed statistics on their performance

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request
