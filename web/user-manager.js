// User Profile Management System
class UserManager {
    constructor() {
        this.users = this.loadUsers();
        this.currentUser = null;
    }

    // Rank system: 18급(1) to 9단(27)
    static RANKS = [
        { level: 1, name: '18급', xpRequired: 0 },
        { level: 2, name: '17급', xpRequired: 100 },
        { level: 3, name: '16급', xpRequired: 250 },
        { level: 4, name: '15급', xpRequired: 450 },
        { level: 5, name: '14급', xpRequired: 700 },
        { level: 6, name: '13급', xpRequired: 1000 },
        { level: 7, name: '12급', xpRequired: 1350 },
        { level: 8, name: '11급', xpRequired: 1750 },
        { level: 9, name: '10급', xpRequired: 2200 },
        { level: 10, name: '9급', xpRequired: 2700 },
        { level: 11, name: '8급', xpRequired: 3250 },
        { level: 12, name: '7급', xpRequired: 3850 },
        { level: 13, name: '6급', xpRequired: 4500 },
        { level: 14, name: '5급', xpRequired: 5200 },
        { level: 15, name: '4급', xpRequired: 5950 },
        { level: 16, name: '3급', xpRequired: 6750 },
        { level: 17, name: '2급', xpRequired: 7600 },
        { level: 18, name: '1급', xpRequired: 8500 },
        { level: 19, name: '1단', xpRequired: 9450 },
        { level: 20, name: '2단', xpRequired: 10450 },
        { level: 21, name: '3단', xpRequired: 11500 },
        { level: 22, name: '4단', xpRequired: 12600 },
        { level: 23, name: '5단', xpRequired: 13750 },
        { level: 24, name: '6단', xpRequired: 14950 },
        { level: 25, name: '7단', xpRequired: 16200 },
        { level: 26, name: '8단', xpRequired: 17500 },
        { level: 27, name: '9단', xpRequired: 18850 }
    ];

    loadUsers() {
        const stored = localStorage.getItem('janggi_users');
        return stored ? JSON.parse(stored) : [];
    }

    saveUsers() {
        localStorage.setItem('janggi_users', JSON.stringify(this.users));
    }

    createUser(name, preferredFormationCho = 0, preferredFormationHan = 0, aiDelay = 2) {
        const user = {
            id: Date.now().toString(),
            name: name,
            rank: 1, // Start at 18급
            experience: 0,
            preferredFormation: {
                cho: preferredFormationCho,
                han: preferredFormationHan
            },
            aiDelay: aiDelay,
            sideHistory: [],
            gamesPlayed: 0,
            wins: 0,
            losses: 0
        };
        this.users.push(user);
        this.saveUsers();
        return user;
    }

    updateUser(userId, updates) {
        const user = this.users.find(u => u.id === userId);
        if (user) {
            Object.assign(user, updates);
            this.saveUsers();
        }
        return user;
    }

    deleteUser(userId) {
        this.users = this.users.filter(u => u.id !== userId);
        this.saveUsers();
    }

    getUser(userId) {
        return this.users.find(u => u.id === userId);
    }

    getAllUsers() {
        return this.users;
    }

    setCurrentUser(userId) {
        this.currentUser = this.getUser(userId);
        return this.currentUser;
    }

    getRankInfo(rank) {
        return UserManager.RANKS.find(r => r.level === rank) || UserManager.RANKS[0];
    }

    getRankFromXP(xp) {
        for (let i = UserManager.RANKS.length - 1; i >= 0; i--) {
            if (xp >= UserManager.RANKS[i].xpRequired) {
                return UserManager.RANKS[i].level;
            }
        }
        return 1;
    }

    getNextSide(user) {
        if (!user.sideHistory || user.sideHistory.length === 0) {
            return 'cho'; // Default to cho for first game
        }
        const lastSide = user.sideHistory[user.sideHistory.length - 1];
        return lastSide === 'cho' ? 'han' : 'cho';
    }

    getAIDifficulty(rank) {
        // Map rank (1-27) to AI difficulty depth
        // 18급-16급 (1-3)   → depth 2-3 (초보자)
        // 15급-11급 (4-8)   → depth 4-5 (중급자)
        // 10급-4급  (9-15)  → depth 6-7 (상급자)
        // 3급-1단   (16-19) → depth 8-9 (고수)
        // 2단-9단   (20-27) → depth 10-12 (최고수)

        if (rank <= 3) return 2 + Math.floor((rank - 1) / 2); // 2-3
        if (rank <= 8) return 4 + Math.floor((rank - 4) / 3); // 4-5
        if (rank <= 15) return 6 + Math.floor((rank - 9) / 4); // 6-7
        if (rank <= 19) return 8 + Math.floor((rank - 16) / 2); // 8-9
        return Math.min(12, 10 + Math.floor((rank - 20) / 4)); // 10-12
    }

    recordGameResult(user, won) {
        const xpChange = won ? 100 : -50;
        const newXP = Math.max(0, user.experience + xpChange);
        const oldRank = user.rank;
        const newRank = this.getRankFromXP(newXP);

        user.experience = newXP;
        user.rank = newRank;
        user.gamesPlayed++;
        if (won) {
            user.wins++;
        } else {
            user.losses++;
        }

        this.saveUsers();

        return {
            xpChange: xpChange,
            newXP: newXP,
            oldRank: oldRank,
            newRank: newRank,
            rankChanged: oldRank !== newRank
        };
    }

    recordSide(user, side) {
        user.sideHistory.push(side);
        // Keep only last 10 games
        if (user.sideHistory.length > 10) {
            user.sideHistory = user.sideHistory.slice(-10);
        }
        this.saveUsers();
    }

    getRandomFormation() {
        return Math.floor(Math.random() * 4);
    }
}
