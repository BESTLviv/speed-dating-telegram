# speed-dating-telegram
Telegram Bot with simple, 1-click Speed Dating functionality.

Work flow:

1) Bot is added into a group chat.

2) A Speed Dating round starts with a command /speed_dating

3) Users have 120 seconds to reserve a place to participate in a Speed dating Round.
To register - users must have started the bot in private messages and should write /go on the group chat when there is a registration for a Speed Dating round

4) Each random pair from Round participants get a message from bot, with a link to a randomly generated meet.jit.si room

5) Each Date takes 10 minutes. After that, participants have to confirm that themselves for a next round

6) The Speed dating session is until a /stop_dating command called

7) Bot will try to avoid repetitive pairs in a single session. To clear 'pairs history' - command /reset_old_pairs
