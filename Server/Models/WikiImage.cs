using System;
using Supabase.Postgrest.Attributes;
using Supabase.Postgrest.Models;

namespace Server.Models
{
    [Table("wiki_images")]
    public class WikiImage : BaseModel
    {
        [PrimaryKey("id")]
        public Guid Id { get; set; }

        [Column("restaurant_id")]
        public string RestaurantId { get; set; } = string.Empty;

        [Column("user_id")]
        public Guid UserId { get; set; }

        [Column("image_url")]
        public string ImageUrl { get; set; }

        [Column("created_at")]
        public DateTime CreatedAt { get; set; }
    }
}
