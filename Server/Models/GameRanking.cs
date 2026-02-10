using Supabase.Postgrest.Attributes;
using Supabase.Postgrest.Models;
using Newtonsoft.Json;
using System;

namespace Server.Models
{
    [Table("game_rankings")]
    public class GameRanking : BaseModel
    {
        [PrimaryKey("id")]
        public long Id { get; set; }

        [Column("nickname")]
        public string Nickname { get; set; }

        [Column("score")]
        public double Score { get; set; } // 생존 시간 (초)

        [Column("created_at")]
        public DateTime CreatedAt { get; set; }
    }
}
