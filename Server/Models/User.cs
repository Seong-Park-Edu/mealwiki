using Supabase.Postgrest.Attributes;
using Supabase.Postgrest.Models;
using Newtonsoft.Json;
using System;

namespace Server.Models
{
    [Table("users")]
    public class User : BaseModel
    {
        [PrimaryKey("id")]
        [JsonProperty("id")]
        public Guid Id { get; set; }

        [Column("nickname")]
        [JsonProperty("nickname")]
        public string Nickname { get; set; }

        // ★ 비밀번호 추가
        [Column("password")]
        [JsonProperty("password")]
        public string Password { get; set; }

        [Column("review_count")]
        [JsonProperty("review_count")]
        public int ReviewCount { get; set; }

        [Column("total_likes")]
        [JsonProperty("total_likes")]
        public int TotalLikes { get; set; }

        [Column("created_at")]
        [JsonProperty("created_at")]
        public DateTime CreatedAt { get; set; }

        [Column("email")]
        [JsonProperty("email")]
        public string Email { get; set; } // ★ 추가됨

        [Column("role")] // ★ DB의 소문자 'role' 컬럼과 매핑
        public string Role { get; set; }
    }
}